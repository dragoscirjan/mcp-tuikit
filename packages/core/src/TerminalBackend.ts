import fs from 'node:fs/promises';
import { SessionHandler } from './SessionHandler.js';
import { SnapshotStrategy } from './SnapshotStrategy.js';

export type IdType = string | null;

export abstract class TerminalBackend {
  protected _sessionName: IdType = null;
  protected _spawnResult: unknown;

  protected _processId: IdType = null;
  protected _windowId: IdType = null;

  public get sessionName(): IdType {
    return this._sessionName;
  }
  public get spawnResult(): unknown {
    return this._spawnResult;
  }
  public get processId(): IdType {
    return this._processId;
  }
  public get windowId(): IdType {
    return this._windowId;
  }

  protected cols: number = 120;
  protected rows: number = 40;
  protected colsPaddingPixels = 50;
  protected rowsPaddingPixels = 50;

  constructor(
    public readonly sessionHandler: SessionHandler,
    public readonly snapshotStrategy: SnapshotStrategy,
  ) {}

  public async connect(cmd: string, cols: number, rows: number): Promise<void> {
    this.cols = cols;
    this.rows = rows;

    this._sessionName = await this.sessionHandler.createSession(cmd, cols, rows);

    await this.spawn();
  }

  public async disconnect(): Promise<void> {
    if (this._sessionName) {
      await this.sessionHandler.closeSession(this._sessionName).catch(() => {});
      this._sessionName = null;
    }
    await this.close();
  }

  public async spawn(): Promise<void> {}

  public async close(): Promise<void> {}

  protected sizeInPixels(cols: number, rows: number): [number, number] {
    return [cols * 10 + this.colsPaddingPixels, rows * 20 + this.rowsPaddingPixels];
  }

  public async takeSnapshot(outputPath: string, format: 'png' | 'txt', cols: number, rows: number): Promise<void> {
    if (!this._sessionName) throw new Error('No active session to snapshot');

    if (format === 'txt') {
      const stdout = await this.sessionHandler.getScreenPlaintext(this._sessionName, rows);
      await fs.writeFile(outputPath, stdout);
    } else {
      await this.snapshotStrategy.capture(outputPath, cols, rows, this._sessionName, this._spawnResult);
    }
  }

  public async sendKeys(keys: string): Promise<void> {
    if (!this._sessionName) throw new Error('No active session');
    await this.sessionHandler.sendKeys(this._sessionName, keys);
  }

  public async waitForText(pattern: string, timeoutMs: number): Promise<void> {
    if (!this._sessionName) throw new Error('No active session');
    await this.sessionHandler.waitForText(this._sessionName, pattern, timeoutMs);
  }

  public onData(listener: (data: string) => void): { dispose: () => void } | null {
    if (!this._sessionName) throw new Error('No active session');
    if (typeof this.sessionHandler.onData === 'function') {
      return this.sessionHandler.onData(this._sessionName, listener);
    }
    return null;
  }
}
