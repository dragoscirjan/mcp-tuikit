import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TerminalBackend, BackendFactory } from '@dragoscirjan/mcp-tuikit-terminals';
import { it, expect, beforeAll, afterAll, vi } from 'vitest';
import { getTerminalTestSuite, RunBackendOptions } from './canRunTerminal.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const snapshotsDir = path.join(repoRoot, 'snapshots');

export interface ExtendedRunBackendOptions extends RunBackendOptions {
  headless?: boolean;
  displayServer?: 'xvfb' | 'sway' | 'kwin';
}

export function defineBackendSuite(opts: ExtendedRunBackendOptions): void {
  const { label, terminal, cols = 80, rows = 24, headless, displayServer } = opts;

  let finalLabel = label || `Terminal Backends Integration (${terminal})`;
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

  // Backend testing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let d: any = suite.d;
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
    let backend: TerminalBackend;
    const originalEnv = { ...process.env };
    let hasCommandSpy: ReturnType<typeof vi.spyOn> | undefined;
    let tempDir: string | undefined;

    let snapshotName = `integration-${terminal}`;
    if (headless) {
      snapshotName += displayServer ? `-headless-${displayServer}` : '-headless';
    } else {
      snapshotName += '-headed';
    }

    const txtPath = path.join(snapshotsDir, `${snapshotName}.txt`);
    const pngPath = path.join(snapshotsDir, `${snapshotName}.png`);

    beforeAll(async () => {
      fs.mkdirSync(snapshotsDir, { recursive: true });

      if (headless) {
        process.env.TUIKIT_HEADLESS = '1';

        // Isolate XDG_RUNTIME_DIR to prevent terminals like Ghostty from connecting
        // to the user's running daemon on Wayland/DBus.
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `mcp-tuikit-test-${terminal}-`));
        process.env.XDG_RUNTIME_DIR = tempDir || '';
      } else {
        process.env.TUIKIT_HEADLESS = '0';
      }

      // Mock VirtualSessionManager if we want a specific display server
      if (headless && displayServer) {
        const { VirtualSessionManager } = await import('@dragoscirjan/mcp-tuikit-spawn');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hasCommandSpy = vi.spyOn(VirtualSessionManager as any, 'hasCommand').mockImplementation((async (
          cmd: string,
        ) => {
          if (displayServer === 'xvfb' && cmd === 'Xvfb') return true;
          if (displayServer === 'sway' && cmd === 'sway') return true;
          if (displayServer === 'kwin' && cmd === 'kwin_wayland') return true;
          return false;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any);
      }

      backend = BackendFactory.create(terminal);

      let shellCmd = process.env.SHELL || 'zsh';
      if (process.platform === 'win32') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((terminal as any) === 'cmd') shellCmd = 'cmd.exe';
        else if (terminal === 'powershell' || terminal === 'windows-terminal') shellCmd = 'powershell.exe';
        else shellCmd = 'powershell.exe'; // fallback for win32
      }

      await backend.connect(shellCmd, cols, rows);
    });

    afterAll(async () => {
      if (backend) {
        await backend.disconnect();
      }
      process.env = originalEnv;
      if (hasCommandSpy) {
        hasCommandSpy.mockRestore();
      }
      if (tempDir) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    const variantSuffix = headless
      ? terminal === 'xterm.js'
        ? 'headless via Playwright'
        : `headless via ${displayServer || 'default'}`
      : 'headed';

    it(`should assign processId and windowId for non-xterm backends (${terminal} - ${variantSuffix})`, () => {
      if (terminal !== 'xterm.js') {
        expect(backend.processId).toBeDefined();
        expect(backend.windowId).toBeDefined();
      }
    });

    it(`should execute shell loop and capture output (${terminal} - ${variantSuffix})`, async () => {
      // Send OS/shell appropriate loop syntax
      if (process.platform === 'win32') {
        if ((terminal as string) === 'cmd') {
          // CMD syntax: delay 1 sec between prints
          await backend.sendKeys('for /L %i in (1,1,5) do (echo LLM-TEST-OUTPUT-%i & timeout /t 1 >nul)\n');
        } else {
          // PowerShell syntax
          await backend.sendKeys('1..5 | % { echo "LLM-TEST-OUTPUT-$_"; sleep -m 100 }\n');
        }
      } else {
        // Bash/Zsh syntax
        // Escaping $ so it doesn't get evaluated by the host shell running `tmux send-keys` but sent as literal $ to the terminal
        await backend.sendKeys('for i in {1..5}; do echo LLM-TEST-OUTPUT-$i; sleep 0.1; done\n');
      }

      // Wait for output to complete
      await backend.waitForText('LLM-TEST-OUTPUT-5', 10_000);

      // Delay slightly for render compositing (increased for WezTerm transparency initialization)
      await new Promise((r) => setTimeout(r, 3000));

      await backend.takeSnapshot(txtPath, 'txt', cols, rows);
      await backend.takeSnapshot(pngPath, 'png', cols, rows);

      const txtContent = fs.readFileSync(txtPath, 'utf8');
      const pngBuffer = fs.readFileSync(pngPath);

      expect(txtContent).toContain('LLM-TEST-OUTPUT-5');
      expect(pngBuffer.length).toBeGreaterThan(0);
    }, 30000); // Give playwright / real terminals 30s to finish
  });
}
