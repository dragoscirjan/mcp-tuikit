import { TerminalBackend } from '@mcp-tuikit/core';
import { capturePlaywrightSnapshot } from './backends/playwright.js';
import { getBackendConfig } from './config.js';
import { Flow, Action } from './schema.js';
import { captureMacOsWindow } from './snapshotters/macos.js';
import { spawnTerminal } from './spawner.js';

export class FlowRunner {
  private backend: TerminalBackend;
  private sessionId: string | null = null;
  private rollingBuffer: string = '';
  public artifacts: string[] = [];
  private dataListener: { dispose: () => void } | null = null;
  private backendConfig: string;

  constructor(backend: TerminalBackend) {
    this.backend = backend;
    this.backendConfig = getBackendConfig();
  }

  public async run(flow: Flow): Promise<string[]> {
    for (const step of flow.steps) {
      await this.executeStep(step);
    }
    return this.artifacts;
  }

  public async cleanup(): Promise<void> {
    if (this.dataListener) {
      this.dataListener.dispose();
      this.dataListener = null;
    }
    if (this.sessionId) {
      await this.backend.closeSession(this.sessionId);
      this.sessionId = null;
    }
  }

  private async executeStep(step: Action): Promise<void> {
    switch (step.action) {
      case 'spawn': {
        const tmuxSessionName = `tuikit_${Date.now()}`;

        if (this.backendConfig !== 'playwright') {
          const cols = step.cols ?? 120;
          const rows = step.rows ?? 40;
          this.sessionId = await this.backend.createSession(
            `tmux new-session -s ${tmuxSessionName} -x ${cols} -y ${rows} -d '${step.cmd}' && tmux attach -t ${tmuxSessionName}`,
            cols,
            rows,
          );
          await spawnTerminal(this.backendConfig, tmuxSessionName);
        } else {
          this.sessionId = await this.backend.createSession(step.cmd, step.cols ?? 120, step.rows ?? 40);
        }

        // Pipe raw ANSI stream continuously
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const backendAny = this.backend as any;
        if (typeof backendAny.onData === 'function') {
          this.dataListener = backendAny.onData(this.sessionId, (data: string) => {
            this.rollingBuffer += data;
            if (this.rollingBuffer.length > 50000) {
              this.rollingBuffer = this.rollingBuffer.slice(-25000);
            }
          });
        }
        break;
      }

      case 'type': {
        if (!this.sessionId) throw new Error('No active session');
        const textToSend = step.submit ? `${step.text}\n` : step.text;
        await this.backend.sendKeys(this.sessionId, textToSend);
        break;
      }

      case 'send_key':
        if (!this.sessionId) throw new Error('No active session');
        await this.backend.sendKeys(this.sessionId, step.key);
        break;

      case 'snapshot': {
        if (!this.sessionId) throw new Error('No active session');

        if (this.backendConfig === 'playwright') {
          await capturePlaywrightSnapshot(this.rollingBuffer, step.outputPath, step.cols ?? 120, step.rows ?? 40);
        } else if (process.platform === 'darwin') {
          await captureMacOsWindow(this.backendConfig, step.outputPath);
        }

        this.artifacts.push(step.outputPath);
        break;
      }

      case 'wait_for':
        if (!this.sessionId) throw new Error('No active session');
        await this.waitForPattern(step.pattern, step.timeoutMs ?? 10000);
        break;
    }
  }

  private async waitForPattern(pattern: string, timeoutMs: number): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const backendAny = this.backend as any;
    if (typeof backendAny.onData === 'function' && this.sessionId) {
      return new Promise<void>((resolve, reject) => {
        let isResolved = false;

        const state: {
          timer?: ReturnType<typeof setTimeout>;
          listener?: { dispose: () => void };
        } = {};

        const checkBuffer = () => {
          if (this.rollingBuffer.includes(pattern) || new RegExp(pattern).test(this.rollingBuffer)) {
            isResolved = true;
            cleanup();
            resolve();
          }
        };

        const cleanup = () => {
          if (state.timer) clearTimeout(state.timer);
          if (state.listener) state.listener.dispose();
        };

        checkBuffer();
        if (isResolved) return;

        state.listener = backendAny.onData(this.sessionId!, () => {
          if (!isResolved) {
            checkBuffer();
          }
        });

        state.timer = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            cleanup();
            reject(new Error(`Timeout waiting for pattern: ${pattern}`));
          }
        }, timeoutMs);
      });
    } else {
      await this.backend.waitForText(this.sessionId!, pattern, timeoutMs);
    }
  }
}
