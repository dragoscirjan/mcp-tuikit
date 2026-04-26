import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { TerminalBackend, SessionHandler, SnapshotStrategy, AppSpawner, SpawnOptions } from '../index.js';

const execAsync = promisify(exec);

export abstract class ShellSpawnedBackend extends TerminalBackend {
  constructor(
    sessionHandler: SessionHandler,
    snapshotStrategy: SnapshotStrategy,
    protected readonly spawner: AppSpawner,
  ) {
    super(sessionHandler, snapshotStrategy);
  }

  /**
   * Generates the necessary options to spawn the target terminal application, ensuring
   * it connects to the active tmux session.
   *
   * @param tmuxAbsPath The absolute path to the tmux executable.
   * @param sessionName The active tmux session name to attach to.
   * @returns SpawnOptions defining the executable, arguments, and environment overrides.
   */
  protected abstract getSpawnOptions(tmuxAbsPath: string, sessionName: string): Promise<SpawnOptions>;

  public async spawn(): Promise<void> {
    const sessionName = this._sessionName;
    if (!sessionName) throw new Error('Cannot spawn backend without an active session ID');

    const cmd = process.platform === 'win32' ? 'where.exe tmux' : 'which tmux';
    const { stdout: tmuxBin } = await execAsync(cmd);
    const tmuxAbsPath = tmuxBin.split('\n')[0].trim();

    const spawnOptions = await this.getSpawnOptions(tmuxAbsPath, sessionName);
    const result = await this.spawner.spawn(spawnOptions);

    this._processId = result.pid?.toString() || null;
    this._windowId = result.windowId;

    // Pass the full result but ensure windowHandle mapping is preserved for older snapshotters
    this._spawnResult = { ...result, windowHandle: this._windowId };
  }

  public async close(): Promise<void> {
    if (this._processId) {
      await this.spawner.kill(Number(this._processId)).catch(() => {});
    }
  }
}
