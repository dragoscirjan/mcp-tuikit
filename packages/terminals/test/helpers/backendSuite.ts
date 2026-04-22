import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TerminalBackend } from '@mcp-tuikit/core';
import { it, expect, beforeAll, afterAll } from 'vitest';
import { getTerminalTestSuite, RunBackendOptions } from '../../../core/test/helpers/canRunTerminal';
import { BackendFactory } from '../../src';

export function defineBackendSuite(opts: RunBackendOptions): void {
  const { label, terminal, cols = 80, rows = 24 } = opts;

  const finalLabel = label || `Terminal Backends Integration (${terminal})`;
  const suite = getTerminalTestSuite(terminal, finalLabel);

  suite.d(suite.label, () => {
    let backend: TerminalBackend;
    let tempDir: string;

    beforeAll(async () => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `mcp-tuikit-test-${terminal}-`));
      backend = BackendFactory.create(terminal);

      let shellCmd = process.env.SHELL || 'zsh';
      if (process.platform === 'win32') {
        if (terminal === 'cmd') shellCmd = 'cmd.exe';
        else if (terminal === 'powershell' || terminal === 'windows-terminal') shellCmd = 'powershell.exe';
        else shellCmd = 'powershell.exe'; // fallback for win32
      }

      await backend.connect(shellCmd, cols, rows);
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
      // Send OS/shell appropriate loop syntax
      if (process.platform === 'win32') {
        if (terminal === 'cmd') {
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

      const txtPath = path.join(tempDir, 'snapshot.txt');
      const pngPath = path.join(tempDir, 'snapshot.png');

      await backend.takeSnapshot(txtPath, 'txt', cols, rows);
      await backend.takeSnapshot(pngPath, 'png', cols, rows);

      const txtContent = fs.readFileSync(txtPath, 'utf8');
      const pngBuffer = fs.readFileSync(pngPath);

      expect(txtContent).toContain('LLM-TEST-OUTPUT-5');
      expect(pngBuffer.length).toBeGreaterThan(0);
    }, 30000); // Give playwright / real terminals 30s to finish
  });
}
