import { TerminalBackend, SessionHandler, SnapshotStrategy, AppSpawner } from '@mcp-tuikit/core';
import { execAsync } from '../utils/execAsync.js';

export class WezTermBackend extends TerminalBackend {
  constructor(
    sessionHandler: SessionHandler,
    snapshotStrategy: SnapshotStrategy,
    private readonly spawner: AppSpawner,
  ) {
    super(sessionHandler, snapshotStrategy);
  }

  public async spawn(): Promise<void> {
    if (!this._sessionName) throw new Error('Cannot spawn WezTerm without an active session ID');

    const { stdout: tmuxBin } = await execAsync('which tmux');
    const tmuxAbsPath = tmuxBin.trim();

    const bin =
      process.env.WEZTERM_BIN ??
      (process.platform === 'darwin' ? '/Applications/WezTerm.app/Contents/MacOS/wezterm-gui' : 'wezterm');

    const args = ['start', '--always-new-process', '--', tmuxAbsPath, 'attach', '-t', this._sessionName];

    const result = await this.spawner.spawn({
      appName: 'WezTerm',
      executable: bin, // Used by MacOsNativeSpawner
      args,
      requireWindowId: true,
    });

    this._processId = result.pid?.toString() || null;
    this._windowId = result.windowId;
  }

  public async close(): Promise<void> {
    if (this._processId) {
      await this.spawner.kill(Number(this._processId)).catch(() => {});
    }
  }
}
