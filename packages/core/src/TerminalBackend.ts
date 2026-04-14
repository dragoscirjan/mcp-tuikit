import fs from 'node:fs/promises';
import { SessionHandler } from './SessionHandler.js';
import { SnapshotStrategy } from './SnapshotStrategy.js';

export abstract class TerminalBackend {
  public sessionId: string | null = null;
  public innerSessionName: string | null = null;
  public spawnResult: unknown;

  constructor(
    public readonly sessionHandler: SessionHandler,
    public readonly snapshotStrategy: SnapshotStrategy,
  ) {}

  abstract connect(cmd: string, cols: number, rows: number): Promise<void>;
  abstract disconnect(): Promise<void>;

  public async takeSnapshot(outputPath: string, format: 'png' | 'txt', cols: number, rows: number): Promise<void> {
    const captureTarget = this.innerSessionName ?? this.sessionId;
    if (!captureTarget) throw new Error('No active session to snapshot');

    if (format === 'txt') {
      const stdout = await this.sessionHandler.getScreenPlaintext(captureTarget, rows);
      await fs.writeFile(outputPath, stdout);
    } else {
      await this.snapshotStrategy.capture(outputPath, cols, rows, captureTarget);
    }
  }

  public async sendKeys(keys: string): Promise<void> {
    if (!this.sessionId) throw new Error('No active session');
    await this.sessionHandler.sendKeys(this.sessionId, keys);
  }

  public async waitForText(pattern: string, timeoutMs: number): Promise<void> {
    const targetSession = this.innerSessionName ?? this.sessionId;
    if (!targetSession) throw new Error('No active session');
    await this.sessionHandler.waitForText(targetSession, pattern, timeoutMs);
  }

  public onData(listener: (data: string) => void): { dispose: () => void } | null {
    const listenTarget = this.innerSessionName ?? this.sessionId;
    if (!listenTarget) throw new Error('No active session');
    if (typeof this.sessionHandler.onData === 'function') {
      return this.sessionHandler.onData(listenTarget, listener);
    }
    return null;
  }
}
