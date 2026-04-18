import { SpawnOptions } from '@mcp-tuikit/core';
import { BaseSpawnerBackend } from './BaseSpawnerBackend.js';

export class GhosttyBackend extends BaseSpawnerBackend {
  protected async getSpawnOptions(tmuxAbsPath: string, sessionName: string): Promise<SpawnOptions> {
    const args = [
      `--window-width=${this.cols}`,
      `--window-height=${this.rows}`,
      '-e',
      '/bin/bash',
      '-c',
      `${tmuxAbsPath} attach -t ${sessionName}`,
    ];

    return {
      appName: 'Ghostty',
      executable: process.platform === 'darwin' ? 'Ghostty.app' : 'ghostty',
      args,
      requireWindowId: true,
    };
  }
}
