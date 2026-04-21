import { spawn } from 'node:child_process';
import { execa } from 'execa';
import { isX11DisplayServer } from '../../utils/linuxDisplay.js';
import { AppSpawner, SpawnOptions, SpawnResult } from '../AppSpawner.js';

export interface LinuxSpawnResult extends SpawnResult {
  fallbackIdentifier?: string;
}

export class LinuxNativeSpawner implements AppSpawner {
  async spawn(options: SpawnOptions): Promise<LinuxSpawnResult> {
    const { executable, args, env, requireWindowId, appName } = options;

    const child = spawn(executable, args, {
      env: { ...process.env, ...env },
      detached: true,
      stdio: 'ignore',
    });

    child.unref();
    const pid = child.pid || null;
    let windowId: string | null = null;

    if (requireWindowId && pid) {
      const isX11 = await isX11DisplayServer();

      if (isX11) {
        windowId = await this.getX11WindowId(pid);
      }
    }

    return {
      pid,
      windowId,
      fallbackIdentifier: appName,
    };
  }

  async kill(pid: number): Promise<void> {
    try {
      process.kill(pid, 'SIGTERM');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ESRCH') {
        throw err;
      }
    }
  }

  private async getX11WindowId(pid: number): Promise<string | null> {
    for (let i = 0; i < 20; i++) {
      try {
        const { stdout } = await execa('xdotool', ['search', '--pid', pid.toString()], { reject: false });
        if (stdout) {
          return stdout.split('\n')[0].trim();
        }
      } catch {
        // Fallback or ignore
      }

      try {
        const { stdout } = await execa('wmctrl', ['-lp'], { reject: false });
        if (stdout) {
          const lines = stdout.split('\n');
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3 && parts[2] === pid.toString()) {
              return parts[0];
            }
          }
        }
      } catch {
        // Fallback or ignore
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return null;
  }
}
