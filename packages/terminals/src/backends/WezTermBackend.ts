import { SpawnOptions } from '@mcp-tuikit/core';
import { BaseSpawnerBackend } from './BaseSpawnerBackend.js';

export class WezTermBackend extends BaseSpawnerBackend {
  protected async getSpawnOptions(tmuxAbsPath: string, sessionName: string): Promise<SpawnOptions> {
    const bin =
      process.env.WEZTERM_BIN ??
      (process.platform === 'darwin'
        ? '/Applications/WezTerm.app/Contents/MacOS/wezterm-gui'
        : process.platform === 'win32'
          ? 'wezterm-gui.exe'
          : 'wezterm');

    const cols = this.cols.toString();
    const rows = this.rows.toString();

    // --config must go before the subcommand
    const args = [
      '--config',
      `initial_cols=${cols}`,
      '--config',
      `initial_rows=${rows}`,
      'start',
      '--always-new-process',
      '--',
      tmuxAbsPath,
      'attach',
      '-t',
      sessionName,
    ];

    return {
      appName: 'WezTerm',
      executable: bin,
      args,
      requireWindowId: true,
    };
  }
}
