import { TerminalBackend, SessionHandler, SnapshotStrategy, AppSpawner, SpawnOptions } from '@mcp-tuikit/core';
import { execAsync } from '../utils/execAsync.js';

export abstract class BaseSpawnerBackend extends TerminalBackend {
  constructor(
    sessionHandler: SessionHandler,
    snapshotStrategy: SnapshotStrategy,
    protected readonly spawner: AppSpawner,
  ) {
    super(sessionHandler, snapshotStrategy);
  }

  protected abstract getSpawnOptions(tmuxAbsPath: string, sessionName: string): Promise<SpawnOptions>;

  public async spawn(): Promise<void> {
    const sessionName = this._sessionName;
    if (!sessionName) throw new Error('Cannot spawn backend without an active session ID');

    const { stdout: tmuxBin } = await execAsync('which tmux');
    const tmuxAbsPath = tmuxBin.trim();

    const spawnOptions = await this.getSpawnOptions(tmuxAbsPath, sessionName);
    const result = await this.spawner.spawn(spawnOptions);

    this._processId = result.pid?.toString() || null;
    this._windowId = result.windowId;
  }

  public async close(): Promise<void> {
    if (this._processId) {
      await this.spawner.kill(Number(this._processId)).catch(() => {});
    }
  }
}
