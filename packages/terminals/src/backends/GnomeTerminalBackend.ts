import { SpawnOptions } from '@mcp-tuikit/core';
import { BaseSpawnerBackend } from './BaseSpawnerBackend.js';

export class GnomeTerminalBackend extends BaseSpawnerBackend {
  protected async getSpawnOptions(tmuxAbsPath: string, sessionName: string): Promise<SpawnOptions> {
    const bin = process.env.GNOME_TERMINAL_BIN ?? 'gnome-terminal';

    const args = [
      '--wait',
      '--hide-menubar',
      `--geometry=${this.cols}x${this.rows}`,
      '--',
      tmuxAbsPath,
      'attach',
      '-t',
      sessionName,
    ];

    return {
      appName: 'GNOME Terminal',
      executable: bin,
      args,
      requireWindowId: true,
    };
  }
}
