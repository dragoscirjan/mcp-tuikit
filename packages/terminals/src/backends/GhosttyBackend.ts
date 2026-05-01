import { SpawnOptions } from '@dragoscirjan/mcp-tuikit-spawn';
import { ShellSpawnedBackend } from '../base/ShellSpawnedBackend.js';

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
