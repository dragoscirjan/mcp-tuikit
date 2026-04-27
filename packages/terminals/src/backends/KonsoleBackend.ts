import { SpawnOptions } from '@mcp-tuikit/core';
import { ShellSpawnedBackend } from '../ShellSpawnedBackend.js';

export class KonsoleBackend extends ShellSpawnedBackend {
  protected async getSpawnOptions(tmuxAbsPath: string, sessionName: string): Promise<SpawnOptions> {
    const bin = process.env.KONSOLE_BIN ?? 'konsole';

    const args = [
      '--separate', // ensures a new process is created, making pid tracking reliable
      '--hide-menubar',
      '--hide-tabbar',
      '-p',
      `TerminalColumns=${this.cols}`,
      '-p',
      `TerminalRows=${this.rows}`,
      '-e',
      tmuxAbsPath,
      'attach',
      '-t',
      sessionName,
    ];

    return {
      appName: 'Konsole',
      executable: bin,
      args,
      requireWindowId: true, // we can rely on standard linux X11/Wayland spawns capturing the windowId
    };
  }
}
