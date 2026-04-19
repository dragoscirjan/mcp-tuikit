import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TerminalBackend } from '@mcp-tuikit/core';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BackendFactory } from '../../src';
import { Terminal } from '../../src';

export interface RunBackendOptions {
  /** Label for the test suite */
  label?: string;
  /** Terminal backend to use (sets TUIKIT_TERMINAL env var). */
  terminal: Terminal;
  /** Number of columns for the spawned terminal. Defaults to 120. */
  cols?: number;
  /** Number of rows for the spawned terminal. Defaults to 40. */
  rows?: number;
  /** How to handle this specific test */
  run?: '' | 'skip' | 'only' | 'missing-binary' | 'wrong-os';
}

function hasBinary(bin: string): boolean {
  try {
    execSync(`which ${bin}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function canRunTerminal(terminal: RunBackendOptions['terminal']): RunBackendOptions['run'] {
  const target = process.env.TUIKIT_TERMINAL_TEST;
  switch (terminal) {
    case 'alacritty':
      return target === 'alacritty' ? 'only' : hasBinary('alacritty') ? '' : 'missing-binary';
    case 'xterm.js':
      return target === 'xterm.js' ? 'only' : '';
    case 'wezterm':
      return target === 'wezterm' ? 'only' : hasBinary('wezterm') ? '' : 'missing-binary';
    case 'kitty':
      return target === 'kitty' ? 'only' : hasBinary('kitty') ? '' : 'missing-binary';
    case 'konsole':
      return process.platform !== 'linux'
        ? 'wrong-os'
        : !hasBinary('konsole')
          ? 'missing-binary'
          : target === 'konsole'
            ? 'only'
            : '';
    case 'gnome-terminal':
      return process.platform !== 'linux'
        ? 'wrong-os'
        : !hasBinary('gnome-terminal')
          ? 'missing-binary'
          : target === 'gnome-terminal'
            ? 'only'
            : '';
    case 'iterm2':
      return process.platform !== 'darwin' ? 'wrong-os' : target === 'iterm2' ? 'only' : '';
    case 'macos-terminal':
      return process.platform !== 'darwin' ? 'wrong-os' : target === 'macos-terminal' ? 'only' : '';
    case 'ghostty':
      return process.platform === 'win32'
        ? 'wrong-os'
        : !hasBinary('ghostty')
          ? 'missing-binary'
          : target === 'ghostty'
            ? 'only'
            : '';
    default:
      return 'skip';
  }
}

/**
 * Declare a describe block that runs a flow and validates its artifacts.
 * The flow is run in a beforeAll block before the tests.
 */
export function defineBackendSuite(opts: RunBackendOptions): void {
  const { label, terminal, cols = 80, rows = 24, run = '' } = opts;

  let d = describe;
  let finalLabel = label || `Terminal Backends Integration (${terminal})`;

  if (run === 'skip') {
    d = describe.skip;
  } else if (run === 'only') {
    d = describe.only;
  } else if (run === 'missing-binary') {
    d = describe.skip;
    finalLabel += ' [UNAVAILABLE: binary missing]';
  } else if (run === 'wrong-os') {
    d = describe.skip;
    finalLabel += ' [SKIPPED: wrong OS]';
  }

  d(finalLabel, () => {
    let backend: TerminalBackend;
    let tempDir: string;

    beforeAll(async () => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `mcp-tuikit-test-${terminal}-`));
      backend = BackendFactory.create(terminal);
      await backend.connect(process.env.SHELL || 'zsh', cols, rows);
    });

    afterAll(async () => {
      if (backend) {
        await backend.disconnect();
      }
      if (tempDir) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it(`should assign processId and windowId for non-xterm backends (${terminal})`, () => {
      if (terminal !== 'xterm.js') {
        expect(backend.processId).toBeDefined();
        expect(backend.windowId).toBeDefined();
      }
    });

    it(`should execute shell loop and capture output (${terminal})`, async () => {
      // Must submit to actually execute the loop in the shell
      // Escaping $ so it doesn't get evaluated by the host shell running `tmux send-keys` but sent as literal $ to the terminal
      await backend.sendKeys('for i in {1..5}; do echo "LLM_TEST_OUTPUT_\\$i"; sleep 0.1; done\n');

      // Wait for output to complete
      await backend.waitForText('LLM_TEST_OUTPUT_5', 10_000);

      // Delay slightly for render compositing
      await new Promise((r) => setTimeout(r, 1000));

      const txtPath = path.join(tempDir, 'snapshot.txt');
      const pngPath = path.join(tempDir, 'snapshot.png');

      await backend.takeSnapshot(txtPath, 'txt', cols, rows);
      await backend.takeSnapshot(pngPath, 'png', cols, rows);

      const txtContent = fs.readFileSync(txtPath, 'utf8');
      const pngBuffer = fs.readFileSync(pngPath);

      expect(txtContent).toContain('LLM_TEST_OUTPUT_5');
      expect(pngBuffer.length).toBeGreaterThan(0);
    }, 30000); // Give playwright / real terminals 30s to finish
  });
}
