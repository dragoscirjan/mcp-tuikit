import { SpawnOptions } from '@mcp-tuikit/core';
import { ShellSpawnedBackend } from '@mcp-tuikit/core';

export class GhosttyBackend extends ShellSpawnedBackend {
  protected async getSpawnOptions(tmuxAbsPath: string, sessionName: string): Promise<SpawnOptions> {
    const args = [
      `--window-width=${this.cols}`,
      `--window-height=${this.rows}`,
      '-e',
      tmuxAbsPath,
      'attach',
      '-t',
      sessionName,
    ];

    return {
      appName: 'Ghostty',
      executable: process.platform === 'darwin' ? 'Ghostty.app' : 'ghostty',
      args,
      requireWindowId: true,
    };
  }
}
