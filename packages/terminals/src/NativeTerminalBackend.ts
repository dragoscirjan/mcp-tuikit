import { TerminalBackend, SessionHandler, SnapshotStrategy } from '@mcp-tuikit/core';
import { nanoid } from 'nanoid';
import { spawnTerminal, closeTerminal, SpawnResult } from './spawner.js';

export class NativeTerminalBackend extends TerminalBackend {
  private backendConfig: string;
  public spawnResult: SpawnResult | null = null;

  constructor(backendConfig: string, sessionHandler: SessionHandler, snapshotStrategy: SnapshotStrategy) {
    super(sessionHandler, snapshotStrategy);
    this.backendConfig = backendConfig;
  }

  async connect(cmd: string, cols: number, rows: number): Promise<void> {
    const tmuxSessionName = `tuikit_${nanoid(8)}`;
    this.innerSessionName = tmuxSessionName;
    this.sessionId = tmuxSessionName;

    await this.sessionHandler.createSession(
      `env TMUX= tmux new-session -s ${tmuxSessionName} -x ${cols} -y ${rows} -d '${cmd}'`,
      cols,
      rows,
    );

    this.spawnResult = await spawnTerminal(this.backendConfig, tmuxSessionName, cols, rows);
  }

  async disconnect(): Promise<void> {
    if (this.sessionId) {
      await this.sessionHandler.closeSession(this.sessionId).catch(() => {});
      this.sessionId = null;
    }
    if (this.spawnResult) {
      await closeTerminal(this.backendConfig, this.spawnResult).catch(() => {});
      this.spawnResult = null;
    }
  }
}
