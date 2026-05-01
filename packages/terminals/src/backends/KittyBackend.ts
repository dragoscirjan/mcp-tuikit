import { SpawnOptions } from '@mcp-tuikit/spawn';
import { ShellSpawnedBackend } from '../base/ShellSpawnedBackend.js';

export class KittyBackend extends ShellSpawnedBackend {
  protected async getSpawnOptions(tmuxAbsPath: string, sessionName: string): Promise<SpawnOptions> {
    const isMac = process.platform === 'darwin';
    const bin = process.env.KITTY_BIN ?? (isMac ? '/Applications/kitty.app/Contents/MacOS/kitty' : 'kitty');

    const args = [
      '--single-instance=no',
      '-o',
      'remember_window_size=no',
      '-o',
      `initial_window_width=${this.cols}c`,
      '-o',
      `initial_window_height=${this.rows}c`,
      ...(isMac ? ['-o', 'macos_quit_when_last_window_closes=yes'] : []),
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
