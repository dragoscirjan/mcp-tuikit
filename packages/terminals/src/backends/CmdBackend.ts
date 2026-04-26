import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SpawnOptions } from '@mcp-tuikit/core';
import { ShellSpawnedBackend } from '@mcp-tuikit/core';

export class CmdBackend extends ShellSpawnedBackend {
  protected async getSpawnOptions(tmuxAbsPath: string, sessionName: string): Promise<SpawnOptions> {
    const tmpBat = path.join(os.tmpdir(), `mcp-tuikit-cmd-${sessionName}.bat`);
    fs.writeFileSync(
      tmpBat,
      `@echo off\r\nmode con: cols=${this.cols} lines=${this.rows}\r\n"${tmuxAbsPath}" attach -t "${sessionName}"\r\n`,
    );

    return {
      appName: 'Command Prompt',
      executable: 'cmd.exe',
      args: ['/k', tmpBat],
      requireWindowId: true,
    };
  }
}
