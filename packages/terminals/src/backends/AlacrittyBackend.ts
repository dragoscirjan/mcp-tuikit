import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { SpawnOptions } from '@dragoscirjan/mcp-tuikit-spawn';
import { ShellSpawnedBackend } from '../base/ShellSpawnedBackend.js';

export class AlacrittyBackend extends ShellSpawnedBackend {
  private tmpConfig: string | null = null;

  protected async getSpawnOptions(tmuxAbsPath: string, sessionName: string): Promise<SpawnOptions> {
    this.tmpConfig = path.join(os.tmpdir(), `alacritty-tuikit-${Date.now()}.toml`);
    const configContent = [
      `[window.dimensions]`,
      `columns = ${this.cols}`,
      `lines = ${this.rows}`,
      ``,
      `[terminal.shell]`,
      `program = '${tmuxAbsPath}'`,
      `args = ["attach", "-t", "${sessionName}"]`,
    ].join('\n');
    await fs.writeFile(this.tmpConfig, configContent, 'utf8');

    return {
      appName: 'Alacritty',
      executable:
        process.platform === 'darwin' ? 'Alacritty' : process.platform === 'win32' ? 'alacritty.exe' : 'alacritty',
      args: ['--config-file', this.tmpConfig],
      requireWindowId: true,
    };
  }

  public async close(): Promise<void> {
    await super.close();
    if (this.tmpConfig) {
      await fs.unlink(this.tmpConfig).catch(() => {});
      this.tmpConfig = null;
    }
  }
}
