#!/usr/bin/env node

import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import {
  FlowRunner,
  Artifact,
  parseFlow,
  parseFlowFromString,
  getBackendConfig,
  isHeadedMode,
  spawnTerminal,
  closeTerminal,
  resolveSnapshotter,
  SpawnResult,
} from '@mcp-tuikit/flow-engine';
import { TmuxBackend } from '@mcp-tuikit/tmux';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const execAsync = promisify(exec);

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 30;
const STATE_DIR = path.join(os.homedir(), '.mcp-tuikit');
const STATE_FILE = path.join(STATE_DIR, 'sessions.json');

// ─── Session registry ─────────────────────────────────────────────────────────

interface SessionEntry {
  id: string;
  command: string;
  cols: number;
  rows: number;
  /** Inner tmux session name used for capture-pane */
  tmuxSession: string;
  spawnResult: SpawnResult;
}

/** In-memory map — also persisted to ~/.mcp-tuikit/sessions.json for crash recovery. */
const sessions = new Map<string, SessionEntry>();

async function persistSessions(): Promise<void> {
  await fs.mkdir(STATE_DIR, { recursive: true });
  const entries = Array.from(sessions.entries()).map(([id, s]) => ({
    id,
    command: s.command,
    cols: s.cols,
    rows: s.rows,
    tmuxSession: s.tmuxSession,
    spawnResult: s.spawnResult,
  }));
  await fs.writeFile(STATE_FILE, JSON.stringify(entries, null, 2), 'utf8');
}

async function removeSessions(): Promise<void> {
  await fs.writeFile(STATE_FILE, JSON.stringify([], null, 2), 'utf8').catch(() => { });
}

// ─── Startup: kill any orphaned sessions from a previous crash ────────────────

async function killOrphanedSessions(): Promise<void> {
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf8');
    const entries: SessionEntry[] = JSON.parse(raw);
    for (const entry of entries) {
      try {
        await execAsync(`tmux kill-session -t ${entry.tmuxSession}`);
      } catch {
        // Already gone
      }
      if (entry.spawnResult) {
        await closeTerminal(backendConfig, entry.spawnResult).catch(() => { });
      }
    }
    await removeSessions();
  } catch {
    // No state file or parse error — nothing to clean
  }
}

// ─── MCP server ───────────────────────────────────────────────────────────────

const server = new McpServer({ name: 'mcp-tuikit', version: '1.0.0' });
const backend = new TmuxBackend();
/** Terminal backend (TUIKIT_TERMINAL, default: xterm.js) */
const backendConfig = getBackendConfig();
/** Whether to open a visible terminal window (TUIKIT_HEADLESS=1 to disable) */
const headed = isHeadedMode();

// ─── Graceful shutdown ────────────────────────────────────────────────────────

const closeAllSessions = async () => {
  for (const entry of sessions.values()) {
    try {
      await backend.closeSession(entry.id);
    } catch {
      /* best-effort */
    }
    try {
      await closeTerminal(backendConfig, entry.spawnResult);
    } catch {
      /* best-effort */
    }
  }
  await removeSessions();
  process.exit(0);
};

process.on('SIGINT', closeAllSessions);
process.on('SIGTERM', closeAllSessions);
process.on('uncaughtException', async (err) => {
  console.error('Uncaught exception:', err);
  await closeAllSessions();
});

// ─── Tools ────────────────────────────────────────────────────────────────────

server.registerTool(
  'create_session',
  {
    description: 'Create a new terminal session and open the configured terminal window.',
    inputSchema: z.object({
      command: z.string().describe('Command to run inside the terminal session'),
      cols: z.number().default(DEFAULT_COLS).describe('Terminal width in columns'),
      rows: z.number().default(DEFAULT_ROWS).describe('Terminal height in rows'),
    }),
  },
  async ({ command, cols, rows }) => {
    let sessionId: string;
    let tmuxSession: string;
    let spawnResult: SpawnResult;

    if (backendConfig !== 'xterm.js') {
      // Headed native terminal mode: create an inner tuikit_* tmux session so
      // the app runs at the requested dimensions, then open a visible terminal
      // window (e.g. ghostty, iterm2) attached to it.  The snapshotter reads
      // the same tmux session via capture-pane.
      tmuxSession = `tuikit_${nanoid(8)}`;
      sessionId = await backend.createSession(
        `env TMUX= tmux new-session -s ${tmuxSession} -x ${cols} -y ${rows} -d '${command}' && env TMUX= tmux attach -t ${tmuxSession}`,
        cols,
        rows,
      );
      spawnResult = await spawnTerminal(backendConfig, tmuxSession, cols, rows);
    } else {
      // xterm.js (any headed/headless): run the command directly in a tmux
      // session; Playwright/xterm.js renders snapshots via capture-pane.
      // Also used for TUIKIT_HEADLESS=1 with any backend.
      sessionId = await backend.createSession(command, cols, rows);
      tmuxSession = sessionId;
      spawnResult = { pid: undefined, windowHandle: null };
    }

    const entry: SessionEntry = { id: sessionId, command, cols, rows, tmuxSession, spawnResult };
    sessions.set(sessionId, entry);
    await persistSessions();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ sessionId, cols, rows }),
        },
      ],
    };
  },
);

server.registerTool(
  'close_session',
  {
    description: 'Close a terminal session and its terminal window.',
    inputSchema: z.object({
      session_id: z.string().describe('Session ID returned by create_session'),
    }),
  },
  async ({ session_id }) => {
    const entry = sessions.get(session_id);
    if (!entry) {
      return {
        content: [{ type: 'text', text: `Unknown session: ${session_id}` }],
        isError: true,
      };
    }

    await closeTerminal(backendConfig, entry.spawnResult).catch(() => { });
    await backend.closeSession(session_id).catch(() => { });
    sessions.delete(session_id);
    await persistSessions();

    return { content: [{ type: 'text', text: `Session closed: ${session_id}` }] };
  },
);

server.registerTool(
  'create_snapshot',
  {
    description: 'Capture a txt and/or png snapshot from an active session. Returns artifact paths as JSON.',
    inputSchema: z.object({
      session_id: z.string().describe('Session ID returned by create_session'),
      format: z.enum(['txt', 'png', 'both']).default('both').describe('Snapshot format to capture'),
      intent: z.string().optional().describe('Human-readable intent / label for this snapshot'),
    }),
  },
  async ({ session_id, format, intent }) => {
    const entry = sessions.get(session_id);
    if (!entry) {
      return {
        content: [{ type: 'text', text: `Unknown session: ${session_id}` }],
        isError: true,
      };
    }

    const hash = nanoid(8);
    const outDir = 'snapshots';
    await fs.mkdir(outDir, { recursive: true });
    const artifacts: { path: string; format: string; intent: string }[] = [];

    try {
      if (format === 'txt' || format === 'both') {
        const txtPath = path.join(outDir, `snapshot_${hash}.txt`);
        const { stdout } = await execAsync(`tmux capture-pane -p -t ${entry.tmuxSession}`);
        await fs.writeFile(txtPath, stdout);
        artifacts.push({ path: txtPath, format: 'txt', intent: intent ?? '' });
      }

      if (format === 'png' || format === 'both') {
        const pngPath = path.join(outDir, `snapshot_${hash}.png`);
        const snapshotter = resolveSnapshotter(backendConfig);
        await snapshotter.capture(pngPath, entry.cols, entry.rows, entry.tmuxSession);
        artifacts.push({ path: pngPath, format: 'png', intent: intent ?? '' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: `Snapshot failed: ${msg}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(artifacts, null, 2) }],
    };
  },
);

server.registerTool(
  'send_keys',
  {
    description: 'Send keystrokes to an active terminal session.',
    inputSchema: z.object({
      session_id: z.string().describe('Session ID'),
      keys: z.string().describe('Keys to send (tmux format)'),
      submit: z.boolean().default(false).describe('Append Enter after the keys'),
    }),
  },
  async ({ session_id, keys, submit }) => {
    if (!sessions.has(session_id)) {
      return {
        content: [{ type: 'text', text: `Unknown session: ${session_id}` }],
        isError: true,
      };
    }
    const payload = submit ? `${keys}\n` : keys;
    await backend.sendKeys(session_id, payload);
    return { content: [{ type: 'text', text: `Sent keys to ${session_id}` }] };
  },
);

server.registerTool(
  'wait_for_text',
  {
    description: 'Wait for a regex pattern to appear in the terminal output.',
    inputSchema: z.object({
      session_id: z.string().describe('Session ID'),
      pattern: z.string().describe('Regex pattern to wait for'),
      timeout_ms: z.number().default(5000).describe('Timeout in milliseconds'),
    }),
  },
  async ({ session_id, pattern, timeout_ms }) => {
    const entry = sessions.get(session_id);
    if (!entry) {
      return {
        content: [{ type: 'text', text: `Unknown session: ${session_id}` }],
        isError: true,
      };
    }
    // Poll the inner tmux session (where the app actually runs)
    const found = await backend.waitForText(entry.tmuxSession, pattern, timeout_ms);
    if (!found) {
      return {
        content: [{ type: 'text', text: `Timeout waiting for pattern: ${pattern}` }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: 'Pattern found' }] };
  },
);

server.registerTool(
  'run_flow',
  {
    description:
      'Run a TUI flow and capture snapshots. Provide either yaml_path (saved file) or yaml_string (inline YAML). Returns artifact list with path, format, and intent.',
    inputSchema: z.object({
      yaml_path: z.string().optional().describe('Absolute or relative path to a YAML flow file'),
      yaml_string: z.string().optional().describe('Inline YAML flow definition'),
      cols: z.number().default(DEFAULT_COLS).describe('Terminal width in columns'),
      rows: z.number().default(DEFAULT_ROWS).describe('Terminal height in rows'),
    }),
  },
  async ({ yaml_path, yaml_string, cols, rows }) => {
    if (!yaml_path && !yaml_string) {
      return {
        content: [{ type: 'text', text: 'Provide either yaml_path or yaml_string.' }],
        isError: true,
      };
    }

    const runner = new FlowRunner(backend, cols, rows);
    let artifacts: Artifact[] = [];

    try {
      const flow = yaml_path ? await parseFlow(yaml_path) : parseFlowFromString(yaml_string!);
      artifacts = await runner.run(flow);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: `Flow execution failed: ${msg}` }],
        isError: true,
      };
    } finally {
      await runner.cleanup();
    }

    const artifactText =
      artifacts.length > 0
        ? `\nArtifacts:\n${artifacts.map((a) => `  [${a.format}] ${a.path}${a.intent ? ` — ${a.intent}` : ''}`).join('\n')}`
        : '';

    return {
      content: [
        {
          type: 'text',
          text: `Flow executed successfully.${artifactText}`,
        },
      ],
    };
  },
);

server.registerTool('list_sessions', { description: 'List all active terminal sessions with metadata.' }, async () => {
  if (sessions.size === 0) {
    return { content: [{ type: 'text', text: 'No active sessions.' }] };
  }

  const rows = await Promise.all(
    Array.from(sessions.values()).map(async (s) => {
      let alive = false;
      try {
        await execAsync(`tmux has-session -t ${s.tmuxSession}`);
        alive = true;
      } catch {
        /* session is gone */
      }
      return `${s.id}  cmd=${s.command}  ${s.cols}x${s.rows}  alive=${alive}`;
    }),
  );

  return { content: [{ type: 'text', text: rows.join('\n') }] };
});

// ─── Resources ────────────────────────────────────────────────────────────────

server.registerResource(
  'terminal_screen_plaintext',
  new ResourceTemplate('terminal://session/{id}/screen.txt?maxLines={limit}', { list: undefined }),
  {
    description: 'Plaintext terminal buffer. Use maxLines to limit output size.',
    mimeType: 'text/plain',
  },
  async (uri, variables) => {
    const id = Array.isArray(variables.id) ? variables.id[0] : variables.id;
    const limitRaw = Array.isArray(variables.limit) ? variables.limit[0] : variables.limit;

    const entry = sessions.get(id as string);
    if (!entry) {
      throw new Error(`Unknown session: ${id}`);
    }

    const limit = limitRaw && limitRaw !== 'undefined' ? parseInt(limitRaw as string, 10) : 0;
    const text = await backend.getScreenPlaintext(id as string, isNaN(limit) ? 0 : limit);

    return { contents: [{ uri: uri.href, text }] };
  },
);

// ─── Startup ──────────────────────────────────────────────────────────────────

async function main() {
  await killOrphanedSessions();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
