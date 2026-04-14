import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { TerminalBackend, SessionHandler, SnapshotStrategy, AppSpawner } from '@mcp-tuikit/core';
import { execAsync } from '../utils/execAsync.js';

export class AlacrittyBackend extends TerminalBackend {
  private tmpConfig: string | null = null;

  constructor(
    sessionHandler: SessionHandler,
    snapshotStrategy: SnapshotStrategy,
    private readonly spawner: AppSpawner,
  ) {
    super(sessionHandler, snapshotStrategy);
  }

  public async spawn(): Promise<void> {
    if (!this._sessionName) throw new Error('Cannot spawn Alacritty without an active session ID');

    const { stdout: tmuxBin } = await execAsync('which tmux');
    const tmuxAbsPath = tmuxBin.trim();

    this.tmpConfig = path.join(os.tmpdir(), `alacritty-tuikit-${Date.now()}.toml`);
    const configContent = [
      `[window.dimensions]`,
      `columns = ${this.cols}`,
      `lines = ${this.rows}`,
      ``,
      `[terminal.shell]`,
      `program = "${tmuxAbsPath}"`,
      `args = ["attach", "-t", "${this._sessionName}"]`,
    ].join('\n');
    await fs.writeFile(this.tmpConfig, configContent, 'utf8');

    const result = await this.spawner.spawn({
      appName: 'Alacritty',
      executable: process.platform === 'darwin' ? 'Alacritty' : 'alacritty',
      args: ['--config-file', this.tmpConfig],
      requireWindowId: true,
    });

    this._processId = result.pid?.toString() || null;
    this._windowId = result.windowId;
  }

  public async close(): Promise<void> {
    if (this._processId) {
      await this.spawner.kill(Number(this._processId)).catch(() => {});
    }
    if (this.tmpConfig) {
      await fs.unlink(this.tmpConfig).catch(() => {});
      this.tmpConfig = null;
    }
  }
}
