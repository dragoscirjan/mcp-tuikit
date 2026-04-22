import { SpawnOptions, SnapshotStrategy, SessionHandler } from '@mcp-tuikit/core';
import { AppSpawner } from '@mcp-tuikit/core';
import { BaseSpawnerBackend } from './BaseSpawnerBackend.js';

export class PowershellBackend extends BaseSpawnerBackend {
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
