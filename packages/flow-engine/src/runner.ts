import fs from 'node:fs/promises';
import path from 'node:path';
import { TerminalBackend } from '@dragoscirjan/mcp-tuikit-terminals';
import { nanoid } from 'nanoid';
import { Flow, Action } from './schema.js';

export interface Artifact {
  path: string;
  format: 'png' | 'txt';
  intent: string;
}

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 30;

export class FlowRunner {
  private backend: TerminalBackend;
  private rollingBuffer: string = '';
  public artifacts: Artifact[] = [];
  private dataListener: { dispose: () => void } | null = null;
  private hash: string;
  private cols: number;
  private rows: number;

  constructor(backend: TerminalBackend, cols: number = DEFAULT_COLS, rows: number = DEFAULT_ROWS) {
    this.backend = backend;
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
    await this.backend.disconnect();
  }

  private async executeStep(step: Action): Promise<void> {
    switch (step.action) {
      case 'spawn': {
        await this.backend.connect(step.cmd, this.cols, this.rows);

        const listener = this.backend.onData((data: string) => {
          this.rollingBuffer += data;
          if (this.rollingBuffer.length > 50000) {
            this.rollingBuffer = this.rollingBuffer.slice(-25000);
          }
        });

        if (listener) {
          this.dataListener = listener;
        }
        break;
      }

      case 'type': {
        const textToSend = step.submit ? `${step.text}\n` : step.text;
        await this.backend.sendKeys(textToSend);
        break;
      }

      case 'send_key':
        await this.backend.sendKeys(step.key);
        break;

      case 'sleep':
        await new Promise((resolve) => setTimeout(resolve, step.ms));
        break;

      case 'snapshot': {
        const outputPath = this.resolvePath(step.outputPath);
        await fs.mkdir(path.dirname(outputPath), { recursive: true });

        await this.backend.takeSnapshot(outputPath, step.format ?? 'txt', this.cols, this.rows);

        this.artifacts.push({ path: outputPath, format: step.format ?? 'txt', intent: step.intent ?? '' });
        break;
      }

      case 'wait_for':
        await this.waitForPattern(step.pattern, step.timeoutMs ?? 10000);
        break;
    }
  }

  private resolvePath(outputPath: string): string {
    return outputPath.replace(/\{hash\}/g, this.hash);
  }

  private async waitForPattern(pattern: string, timeoutMs: number): Promise<void> {
    await this.backend.waitForText(pattern, timeoutMs);
  }
}
