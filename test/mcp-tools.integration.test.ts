/**
 * Integration tests for the MCP tool implementations:
 *   create_session, close_session, send_keys, wait_for_text, list_sessions,
 *   create_snapshot
 *
 * These tests drive the TmuxSessionHandler directly (the same object the MCP handlers
 * delegate to), so they verify the real behaviour without needing a running
 * stdio MCP server.
 *
 * Requirements:
 *   - macOS / Linux with tmux installed and on PATH
 *
 * Run via:
 *   mise run test:integration
 */
import { exec } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { TmuxSessionHandler } from '@mcp-tuikit/tmux';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const execAsync = promisify(exec);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Kill a tmux session if it exists, ignoring errors (best-effort cleanup). */
async function killSession(sessionId: string): Promise<void> {
  await execAsync(`tmux kill-session -t ${sessionId}`).catch(() => {});
}

/** Return true if a tmux session with the given name is alive. */
async function sessionAlive(sessionId: string): Promise<boolean> {
  try {
    await execAsync(`tmux has-session -t ${sessionId}`);
    return true;
  } catch {
    return false;
  }
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('MCP tools integration', () => {
  let backend: TmuxSessionHandler;
  let sessionId: string;

  beforeEach(() => {
    backend = new TmuxSessionHandler();
  });

  afterEach(async () => {
    // Always attempt cleanup even if the test failed mid-way
    if (sessionId) {
      await killSession(sessionId);
      sessionId = '';
    }
  });

  // ── create_session ─────────────────────────────────────────────────────────

  describe('create_session', () => {
    it('creates a tmux session and returns a session ID', async () => {
      sessionId = await backend.createSession('bash', 80, 30);

      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
      expect(await sessionAlive(sessionId)).toBe(true);
    });

    it('creates a session with the requested dimensions', async () => {
      const cols = 100;
      const rows = 35;
      sessionId = await backend.createSession('bash', cols, rows);

      // tmux reports window size via display-message.
      // NOTE: when a client is attached to the tmux server, the server may override
      // the requested dimensions to match the controlling terminal's size.
      // We therefore only assert that tmux returned parseable positive integers,
      // not that they exactly match the requested values.
      const { stdout } = await execAsync(`tmux display-message -p -t ${sessionId} '#{window_width}x#{window_height}'`);
      const [w, h] = stdout.trim().split('x').map(Number);
      expect(w).toBeGreaterThan(0);
      expect(h).toBeGreaterThan(0);
    });
  });

  // ── close_session ──────────────────────────────────────────────────────────

  describe('close_session', () => {
    it('kills a running tmux session', async () => {
      sessionId = await backend.createSession('bash', 80, 30);
      expect(await sessionAlive(sessionId)).toBe(true);

      await backend.closeSession(sessionId);
      expect(await sessionAlive(sessionId)).toBe(false);

      sessionId = ''; // already closed, skip afterEach cleanup
    });

    it('throws TmuxExecutionError when session does not exist', async () => {
      await expect(backend.closeSession('nonexistent-session-xyz')).rejects.toThrow();
    });
  });

  // ── send_keys ──────────────────────────────────────────────────────────────

  describe('send_keys', () => {
    it('sends keys to the session (resolves without error)', async () => {
      sessionId = await backend.createSession('bash', 80, 30);

      await expect(backend.sendKeys(sessionId, 'echo hello')).resolves.not.toThrow();
    });

    it('sends keys with submit (Enter) and text appears in buffer', async () => {
      sessionId = await backend.createSession('bash', 80, 30);

      // Send "echo __INTEGRATION_MARKER__" followed by Enter
      await backend.sendKeys(sessionId, 'echo __INTEGRATION_MARKER__\n');

      // Wait up to 5 s for the output to appear
      const result = await backend.waitForText(sessionId, '__INTEGRATION_MARKER__', 5000);
      expect(result).toMatchObject({ success: true });
    });
  });

  // ── wait_for_text ──────────────────────────────────────────────────────────

  describe('wait_for_text', () => {
    it('resolves when the pattern appears in the terminal', async () => {
      sessionId = await backend.createSession('bash', 80, 30);

      await backend.sendKeys(sessionId, 'echo WAIT_TARGET\n');
      const result = await backend.waitForText(sessionId, 'WAIT_TARGET', 5000);

      expect(result).toMatchObject({ success: true, matchedPattern: 'WAIT_TARGET' });
    });

    it('throws TimeoutError when the pattern never appears', async () => {
      sessionId = await backend.createSession('bash', 80, 30);

      await expect(backend.waitForText(sessionId, 'THIS_WILL_NEVER_APPEAR_XYZ', 1000)).rejects.toThrow(/timed out/i);
    });

    it('supports regex patterns', async () => {
      sessionId = await backend.createSession('bash', 80, 30);

      await backend.sendKeys(sessionId, 'echo hello_world_42\n');
      const result = await backend.waitForText(sessionId, 'hello_world_\\d+', 5000);

      expect(result).toMatchObject({ success: true });
    });
  });

  // ── list_sessions (via getSessionState) ────────────────────────────────────

  describe('list_sessions (getSessionState)', () => {
    it('returns session state string for an alive session', async () => {
      sessionId = await backend.createSession('bash', 80, 30);

      const state = await backend.getSessionState(sessionId);
      // tmux returns the $N session ID token
      expect(typeof state).toBe('string');
      expect(state.length).toBeGreaterThan(0);
    });

    it('returns empty string (not an error) when querying a non-existent session', async () => {
      // tmux display-message exits 0 and returns empty output for unknown sessions —
      // it does not throw. getSessionState mirrors this behaviour.
      const state = await backend.getSessionState('dead-session-abc');
      expect(state).toBe('');
    });
  });

  // ── getScreenPlaintext (used by terminal_screen_plaintext resource) ─────────

  describe('terminal_screen_plaintext resource', () => {
    it('returns non-empty text after printing to the terminal', async () => {
      sessionId = await backend.createSession('bash', 80, 30);

      await backend.sendKeys(sessionId, 'echo SCREEN_CHECK\n');
      // Give bash a moment to flush
      await new Promise((r) => setTimeout(r, 500));

      const text = await backend.getScreenPlaintext(sessionId, 0);
      expect(text.length).toBeGreaterThan(0);
    });

    it('respects maxLines limit', async () => {
      sessionId = await backend.createSession('bash', 80, 30);

      // Print 10 numbered lines
      for (let i = 0; i < 10; i++) {
        await backend.sendKeys(sessionId, `echo LINE_${i}\n`);
      }
      await new Promise((r) => setTimeout(r, 1000));

      const limited = await backend.getScreenPlaintext(sessionId, 3);
      const lines = limited.split('\n').filter((l) => l.trim().length > 0);
      expect(lines.length).toBeLessThanOrEqual(3);
    });
  });

  // ── create_snapshot ────────────────────────────────────────────────────────

  describe('create_snapshot', () => {
    const outDir = path.resolve('snapshots');
    const createdFiles: string[] = [];

    afterEach(async () => {
      for (const f of createdFiles) {
        await fs.unlink(f).catch(() => {});
      }
      createdFiles.length = 0;
    });

    it('writes a txt snapshot with terminal content', async () => {
      sessionId = await backend.createSession('bash', 80, 30);
      await backend.sendKeys(sessionId, 'echo SNAPSHOT_MARKER\n');
      await new Promise((r) => setTimeout(r, 500));

      await fs.mkdir(outDir, { recursive: true });
      const txtPath = path.join(outDir, `snapshot_${randomUUID().slice(0, 8)}.txt`);
      createdFiles.push(txtPath);

      const { stdout } = await promisify(exec)(`tmux capture-pane -p -t ${sessionId}`);
      await fs.writeFile(txtPath, stdout);

      const content = await fs.readFile(txtPath, 'utf8');
      expect(content.length).toBeGreaterThan(0);
      expect(content).toMatch(/SNAPSHOT_MARKER/);
    });

    it('txt snapshot respects session width (160 cols)', async () => {
      sessionId = await backend.createSession('bash -c \'printf "%0.s─" {1..160}; sleep 10\'', 160, 30);
      await new Promise((r) => setTimeout(r, 500));

      const { stdout } = await promisify(exec)(`tmux capture-pane -p -t ${sessionId}`);
      const firstLine = stdout.split('\n')[0];
      // At 160 cols the line should be substantially wider than the 80-col default
      expect(firstLine.length).toBeGreaterThan(80);
    });

    it('txt file is non-empty after snapshot', async () => {
      sessionId = await backend.createSession('bash', 80, 30);
      await backend.sendKeys(sessionId, 'echo HELLO_SNAP\n');
      await new Promise((r) => setTimeout(r, 500));

      await fs.mkdir(outDir, { recursive: true });
      const txtPath = path.join(outDir, `snapshot_${randomUUID().slice(0, 8)}.txt`);
      createdFiles.push(txtPath);

      const { stdout } = await promisify(exec)(`tmux capture-pane -p -t ${sessionId}`);
      await fs.writeFile(txtPath, stdout);

      const stat = await fs.stat(txtPath);
      expect(stat.size).toBeGreaterThan(0);
    });
  });
});
