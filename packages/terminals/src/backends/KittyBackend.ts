import { SpawnOptions } from '@mcp-tuikit/core';
import { BaseSpawnerBackend } from './BaseSpawnerBackend.js';

export class KittyBackend extends BaseSpawnerBackend {
  protected async getSpawnOptions(tmuxAbsPath: string, sessionName: string): Promise<SpawnOptions> {
    const bin =
      process.env.KITTY_BIN ??
      (process.platform === 'darwin' ? '/Applications/kitty.app/Contents/MacOS/kitty' : 'kitty');

    const args = [
      '-o',
      'remember_window_size=no',
      '-o',
      `initial_window_width=${this.cols}c`,
      '-o',
      `initial_window_height=${this.rows}c`,
      '--',
      tmuxAbsPath,
      'attach',
      '-t',
      sessionName,
    ];

    return {
      appName: 'kitty',
      executable: bin,
      args,
      requireWindowId: true,
    };
  }
}
