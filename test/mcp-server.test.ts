import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { Terminal } from '@dragoscirjan/mcp-tuikit-terminals';
import { canRunTerminal, hasBinary, getTerminalTestSuite } from '@dragoscirjan/mcp-tuikit-test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { it, expect, beforeAll, afterAll } from 'vitest';

interface ToolResponseContent {
  type: string;
  text: string;
}

interface ArtifactResult {
  path: string;
  format: string;
}

interface ServerSuiteOptions {
  label: string;
  terminal: Terminal;
  run?: '' | 'skip' | 'only' | 'missing-binary' | 'wrong-os';
  headless?: boolean;
  displayServer?: 'xvfb' | 'sway' | 'kwin';
}

function defineServerSuite(opts: ServerSuiteOptions) {
  const { terminal, headless, displayServer } = opts;

  let finalLabel = opts.label || `MCP Server Integration (${terminal})`;
  if (headless) {
    if (terminal === 'xterm.js') {
      finalLabel += ' (headless via Playwright)';
    } else {
      finalLabel += ` (headless via ${displayServer || 'default'})`;
    }
  } else {
    finalLabel += ' (headed)';
  }

  const suite = getTerminalTestSuite(terminal, finalLabel);

  let d = suite.d;
  if (opts.run === 'skip') {
    d = d.skip;
  } else if (opts.run === 'only') {
    d = d.only;
  } else if (opts.run === 'missing-binary') {
    d = d.skip;
    suite.label += ' [UNAVAILABLE: binary missing]';
  } else if (opts.run === 'wrong-os') {
    d = d.skip;
    suite.label += ' [SKIPPED: wrong OS]';
  }

  d(suite.label, () => {
    let client: Client;
    let transport: StdioClientTransport;
    let tempDir: string | undefined;

    beforeAll(async () => {
      const envOverrides: Record<string, string> = {
        ...process.env,
        TUIKIT_TERMINAL: terminal,
      };

      if (headless) {
        envOverrides.TUIKIT_HEADLESS = '1';
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `mcp-tuikit-server-test-${terminal}-`));
        envOverrides.XDG_RUNTIME_DIR = tempDir;

        // Faking 'which' to force the child node process to pick a specific display server
        if (displayServer) {
          const fakeWhichPath = path.join(tempDir, 'which');
          const mockXvfb = displayServer === 'xvfb' ? '1' : '0';
          const mockSway = displayServer === 'sway' ? '1' : '0';
          const mockKwin = displayServer === 'kwin' ? '1' : '0';

          const { execSync } = await import('node:child_process');
          const realWhich = execSync('which which').toString().trim();

          const fakeWhichScript = `#!/bin/sh
if [ "$1" = "Xvfb" ] && [ "${mockXvfb}" = "0" ]; then exit 1; fi
if [ "$1" = "sway" ] && [ "${mockSway}" = "0" ]; then exit 1; fi
if [ "$1" = "kwin_wayland" ] && [ "${mockKwin}" = "0" ]; then exit 1; fi
exec ${realWhich} "$@"
`;
          await fs.writeFile(fakeWhichPath, fakeWhichScript, { mode: 0o755 });
          envOverrides.PATH = `${tempDir}:${process.env.PATH}`;
        }
      } else {
        envOverrides.TUIKIT_HEADLESS = '0';
      }

      transport = new StdioClientTransport({
        command: 'node',
        args: ['dist/index.js'],
        env: envOverrides,
      });
      client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
      await client.connect(transport);
    }, 30000);

    afterAll(async () => {
      await transport.close();
      if (tempDir) {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
    });

    it(`runs echo loop and captures output via MCP tools (${terminal})`, async () => {
      // 1. Create Session
      const isWin = process.platform === 'win32';
      const shellCmd = isWin ? 'powershell.exe' : 'bash';

      const createRes = await client.callTool({
        name: 'create_session',
        arguments: { command: shellCmd, cols: 80, rows: 24 },
      });
      if (createRes.isError) console.error(createRes);
      expect(createRes.isError).toBeFalsy();
      const createResContent = createRes.content as unknown as ToolResponseContent[];
      const sessionData = JSON.parse(createResContent[0].text);
      const sessionId = sessionData.sessionName;
      expect(sessionId).toBeDefined();

      // 2. Send keys (echo loop)
      const loopCmd = isWin
        ? '1..5 | ForEach-Object { Write-Output LLM-TEST-OUTPUT-$_ ; Start-Sleep -Milliseconds 100 }\n'
        : 'for i in {1..5}; do echo LLM-TEST-OUTPUT-$i; sleep 0.1; done\n';

      const keysRes = await client.callTool({
        name: 'send_keys',
        arguments: {
          session_id: sessionId,
          keys: loopCmd,
          submit: false, // Since we explicitly provide the trailing newline, don't append another
        },
      });
      expect(keysRes.isError).toBeFalsy();

      // 3. Wait for text
      const waitRes = await client.callTool({
        name: 'wait_for_text',
        arguments: {
          session_id: sessionId,
          pattern: 'LLM-TEST-OUTPUT-5',
          timeout_ms: 10000,
        },
      });
      if (waitRes.isError) {
        console.error('Wait Res Error:', JSON.stringify(waitRes.content));
      }
      expect(waitRes.isError).toBeFalsy();

      // Delay slightly for render compositing (increased for WezTerm transparency initialization)
      await new Promise((r) => setTimeout(r, 3000));

      // 4. Create Snapshot
      const snapRes = await client.callTool({
        name: 'create_snapshot',
        arguments: {
          session_id: sessionId,
          format: 'both',
        },
      });
      if (snapRes.isError) {
        console.error('Snap Res Error:', JSON.stringify(snapRes.content));
      }
      expect(snapRes.isError).toBeFalsy();
      const snapResContent = snapRes.content as unknown as ToolResponseContent[];
      const artifacts = JSON.parse(snapResContent[0].text) as ArtifactResult[];

      const txtArtifact = artifacts.find((a) => a.format === 'txt');
      const pngArtifact = artifacts.find((a) => a.format === 'png');

      expect(txtArtifact).toBeDefined();
      expect(pngArtifact).toBeDefined();

      const txtContent = await fs.readFile(txtArtifact!.path, 'utf-8');
      expect(txtContent).toContain('LLM-TEST-OUTPUT-5');

      const pngStat = await fs.stat(pngArtifact!.path);
      expect(pngStat.size).toBeGreaterThan(0);

      // 5. Close Session
      const closeRes = await client.callTool({
        name: 'close_session',
        arguments: { session_id: sessionId },
      });
      expect(closeRes.isError).toBeFalsy();
    }, 30000);
  });
}

function defineTerminalServerSuites(terminal: Terminal, label: string) {
  const baseRun = canRunTerminal(terminal);

  if (terminal === 'xterm.js') {
    defineServerSuite({ label, terminal, run: baseRun, headless: false });
    defineServerSuite({ label, terminal, run: baseRun, headless: true });
    return;
  }

  // 1. Headed run (default)
  defineServerSuite({ label, terminal, run: baseRun, headless: false });

  // 2. Headless run variants (Linux only)
  if (process.platform === 'linux') {
    defineServerSuite({
      label,
      terminal,
      run: baseRun === 'only' ? 'only' : hasBinary('Xvfb') && hasBinary('import') ? baseRun : 'missing-binary',
      headless: true,
      displayServer: 'xvfb',
    });

    defineServerSuite({
      label,
      terminal,
      run: baseRun === 'only' ? 'only' : hasBinary('sway') && hasBinary('grim') ? baseRun : 'missing-binary',
      headless: true,
      displayServer: 'sway',
    });
  }
}

defineTerminalServerSuites('xterm.js', 'MCP Server Integration (xterm.js)');
defineTerminalServerSuites('macos-terminal', 'MCP Server Integration (Terminal )');
defineTerminalServerSuites('iterm2', 'MCP Server Integration (iTerm2)');
defineTerminalServerSuites('alacritty', 'MCP Server Integration (Alacritty)');
defineTerminalServerSuites('wezterm', 'MCP Server Integration (WezTerm)');
defineTerminalServerSuites('ghostty', 'MCP Server Integration (Ghostty)');
defineTerminalServerSuites('konsole', 'MCP Server Integration (Konsole)');
defineTerminalServerSuites('kitty', 'MCP Server Integration (Kitty)');
defineTerminalServerSuites('gnome-terminal', 'MCP Server Integration (GNOME Terminal)');
defineTerminalServerSuites('windows-terminal', 'MCP Server Integration (Windows Terminal)');
defineTerminalServerSuites('powershell', 'MCP Server Integration (PowerShell)');
