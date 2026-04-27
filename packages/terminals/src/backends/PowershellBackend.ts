import { SpawnOptions, SessionHandler } from '@mcp-tuikit/core';
import { SnapshotStrategy } from '../SnapshotStrategy.js';
import { AppSpawner } from '@mcp-tuikit/core';
import { ShellSpawnedBackend } from '../ShellSpawnedBackend.js';

export class PowershellBackend extends ShellSpawnedBackend {
  private executable: string;

  constructor(
    sessionHandler: SessionHandler,
    snapshotStrategy: SnapshotStrategy,
    spawner: AppSpawner,
    executable: string = 'powershell.exe',
  ) {
    super(sessionHandler, snapshotStrategy, spawner);
    this.executable = executable;
  }

  protected async getSpawnOptions(tmuxAbsPath: string, sessionName: string): Promise<SpawnOptions> {
    return {
      appName: 'PowerShell',
      executable: this.executable,
      args: [
        '-NoProfile',
        '-WindowStyle',
        'Normal',
        '-Command',
        `& { mode con: cols=${this.cols} lines=${this.rows}; & "${tmuxAbsPath}" attach -t "${sessionName}" }`,
      ],
      requireWindowId: true,
    };
  }
}
