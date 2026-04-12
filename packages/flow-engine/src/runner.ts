import fs from 'node:fs/promises';
import path from 'node:path';
import { TerminalBackend } from '@mcp-tuikit/core';
import { nanoid } from 'nanoid';
import { getBackendConfig } from './config.js';
import { Flow, Action } from './schema.js';
import { resolveSnapshotter } from './snapshotters/index.js';
import { spawnTerminal, closeTerminal, SpawnResult } from './spawner.js';

/** A produced artifact with its path and display metadata. */
export interface Artifact {
  path: string;
  format: 'png' | 'txt';
  intent: string;
}

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 30;

export class FlowRunner {
  private backend: TerminalBackend;
  private sessionId: string | null = null;
  private innerSessionName: string | null = null;
  private spawnResult: SpawnResult | null = null;
  private rollingBuffer: string = '';
  public artifacts: Artifact[] = [];
  private dataListener: { dispose: () => void } | null = null;
  private backendConfig: string;
  private hash: string;
  private cols: number;
  private rows: number;

  constructor(backend: TerminalBackend, cols: number = DEFAULT_COLS, rows: number = DEFAULT_ROWS) {
    this.backend = backend;
    this.backendConfig = getBackendConfig();
    this.hash = nanoid(8);
    this.cols = cols;
    this.rows = rows;
  }

  public async run(flow: Flow): Promise<Artifact[]> {
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
      // Best-effort: the outer mcp-* session exits immediately after creating
      // the inner tuikit_* session, so it may already be gone by cleanup time.
      await this.backend.closeSession(this.sessionId).catch(() => {});
      this.sessionId = null;
    }
    if (this.innerSessionName) {
      // Kill the inner tuikit_* session that holds the actual app process.
      // Best-effort in case it already exited on its own.
      await this.backend.closeSession(this.innerSessionName).catch(() => {});
      this.innerSessionName = null;
    }
    if (this.spawnResult) {
      await closeTerminal(this.backendConfig, this.spawnResult).catch(() => {
        // Best-effort — process may already be gone
      });
      this.spawnResult = null;
    }
  }

  private async executeStep(step: Action): Promise<void> {
    switch (step.action) {
      case 'spawn': {
        if (this.backendConfig !== 'xterm.js') {
          // Native terminal path: outer mcp-* session launches an inner tuikit_*
          // session so the terminal window can attach to it.  All subsequent
          // operations target the inner session.
          const tmuxSessionName = `tuikit_${nanoid(8)}`;
          this.innerSessionName = tmuxSessionName;
          await this.backend.createSession(
            `env TMUX= tmux new-session -s ${tmuxSessionName} -x ${this.cols} -y ${this.rows} -d '${step.cmd}'`,
            this.cols,
            this.rows,
          );
          this.sessionId = tmuxSessionName;
          this.spawnResult = await spawnTerminal(this.backendConfig, tmuxSessionName, this.cols, this.rows);
        } else {
          // xterm.js path: no terminal window needed — run the app directly in a
          // single tmux session.  innerSessionName and sessionId are the same.
          const sessionId = await this.backend.createSession(step.cmd, this.cols, this.rows);
          this.sessionId = sessionId;
          this.innerSessionName = sessionId;
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

      case 'sleep':
        await new Promise((resolve) => setTimeout(resolve, step.ms));
        break;

      case 'snapshot': {
        if (!this.sessionId) throw new Error('No active session');

        const outputPath = this.resolvePath(step.outputPath);
        await fs.mkdir(path.dirname(outputPath), { recursive: true });

        if (step.format === 'txt') {
          // Capture from the inner tmux session (where the app runs), not the outer wrapper session
          const captureTarget = this.innerSessionName ?? this.sessionId;
          const { stdout } = await import('node:util').then((util) =>
            import('node:child_process').then((cp) =>
              util.promisify(cp.exec)(`tmux capture-pane -p -t ${captureTarget}`),
            ),
          );
          await fs.writeFile(outputPath, stdout);
        } else {
          const snapshotter = resolveSnapshotter(this.backendConfig);
          const captureTarget = this.innerSessionName ?? this.sessionId;
          await snapshotter.capture(outputPath, this.cols, this.rows, captureTarget);
        }

        this.artifacts.push({ path: outputPath, format: step.format ?? 'txt', intent: step.intent ?? '' });
        break;
      }

      case 'wait_for':
        if (!this.sessionId) throw new Error('No active session');
        await this.waitForPattern(step.pattern, step.timeoutMs ?? 10000);
        break;
    }
  }

  private resolvePath(outputPath: string): string {
    return outputPath.replace(/\{hash\}/g, this.hash);
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

        const listenTarget = this.innerSessionName ?? this.sessionId!;
        state.listener = backendAny.onData(listenTarget, () => {
          if (!isResolved) {
            checkBuffer();
          }
        });

        state.timer = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            cleanup();
            reject(new Error(`Wait for text matched /${pattern}/ timed out after ${timeoutMs}ms`));
          }
        }, timeoutMs);
      });
    } else {
      // Use inner session (where the app runs) if available, else fall back to outer session
      const targetSession = this.innerSessionName ?? this.sessionId!;
      await this.backend.waitForText(targetSession, pattern, timeoutMs);
    }
  }
}
