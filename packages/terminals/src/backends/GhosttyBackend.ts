import { randomUUID } from 'node:crypto';
import { TerminalBackend, SessionHandler, SnapshotStrategy, AppSpawner } from '@mcp-tuikit/core';
import { execAsync } from '../utils/execAsync.js';

export class GhosttyBackend extends TerminalBackend {
  constructor(
    sessionHandler: SessionHandler,
    snapshotStrategy: SnapshotStrategy,
    private readonly spawner: AppSpawner,
  ) {
    super(sessionHandler, snapshotStrategy);
  }

  public async spawn(): Promise<void> {
    if (!this._sessionName) throw new Error('Cannot spawn Ghostty without an active session ID');

    const { stdout: tmuxBin } = await execAsync('which tmux');
    const tmuxAbsPath = tmuxBin.trim();

    const windowClass = `mcp-tuikit-${randomUUID()}`;

    const args = [
      `--class=${windowClass}`,
      `--window-width=${this.cols}`,
      `--window-height=${this.rows}`,
      '-e',
      '/bin/bash',
      '-c',
      `${tmuxAbsPath} attach -t ${this._sessionName}`,
    ];

    const result = await this.spawner.spawn({
      appName: 'Ghostty',
      executable: process.platform === 'darwin' ? 'Ghostty.app' : 'ghostty',
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
