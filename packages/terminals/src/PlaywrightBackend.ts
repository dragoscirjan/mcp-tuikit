import { TerminalBackend, SessionHandler, SnapshotStrategy } from '@mcp-tuikit/core';

export class PlaywrightBackend extends TerminalBackend {
  constructor(sessionHandler: SessionHandler, snapshotStrategy: SnapshotStrategy) {
    super(sessionHandler, snapshotStrategy);
  }

  async connect(cmd: string, cols: number, rows: number): Promise<void> {
    const sessionId = await this.sessionHandler.createSession(cmd, cols, rows);
    this.sessionId = sessionId;
    this.innerSessionName = sessionId;
  }

  async disconnect(): Promise<void> {
    if (this.sessionId) {
      await this.sessionHandler.closeSession(this.sessionId).catch(() => {});
      this.sessionId = null;
    }
  }
}
