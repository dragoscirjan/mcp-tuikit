import fs from 'node:fs/promises';
import { TerminalBackend } from '@mcp-tuikit/core';
import { HeadlessRenderer } from './renderer.js';
import { Flow, Action } from './schema.js';

export class FlowRunner {
  private backend: TerminalBackend;
  private renderer: HeadlessRenderer;
  private sessionId: string | null = null;
  private rollingBuffer: string = '';
  public artifacts: string[] = [];
  private dataListener: { dispose: () => void } | null = null;

  constructor(backend: TerminalBackend) {
    this.backend = backend;
    // Delayed initialization happens in spawn action
    this.renderer = new HeadlessRenderer(80, 24);
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
        this.sessionId = await this.backend.createSession(step.cmd, step.cols ?? 80, step.rows ?? 24);
        this.renderer = new HeadlessRenderer(step.cols ?? 80, step.rows ?? 24);

        // Pipe raw ANSI stream continuously to xterm/headless rather than feeding it plaintext later
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const backendAny = this.backend as any;
        if (typeof backendAny.onData === 'function') {
          this.dataListener = backendAny.onData(this.sessionId, (data: string) => {
            this.rollingBuffer += data;
            if (this.rollingBuffer.length > 50000) {
              this.rollingBuffer = this.rollingBuffer.slice(-25000);
            }
            // Fire-and-forget write to terminal
            this.renderer.write(data).catch(() => {});
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

        // If onData was not available, we must fetch screen plaintext as fallback to update the renderer state
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof (this.backend as any).onData !== 'function') {
          const plaintext = await this.backend.getScreenPlaintext(this.sessionId, 0);
          await this.renderer.write(plaintext);
        }

        if (step.format === 'png') {
          await this.renderer.exportPng(step.outputPath);
        } else if (step.format === 'json') {
          const json = await this.renderer.exportJson();
          await fs.writeFile(step.outputPath, JSON.stringify(json, null, 2), 'utf8');
        } else {
          const txt = await this.renderer.exportTxt();
          await fs.writeFile(step.outputPath, txt, 'utf8');
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

        // Use an object to hold mutable references to avoid prefer-const eslint warnings
        // and ReferenceError if accessed synchronously before assignment
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

        // Pre-check before attaching listener, avoiding synchronous resolution race conditions
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
