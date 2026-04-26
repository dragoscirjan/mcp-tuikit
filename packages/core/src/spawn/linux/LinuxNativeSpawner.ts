import { spawn } from 'node:child_process';
import { execa } from 'execa';
import { isX11DisplayServer } from '../../utils/linuxDisplay.js';
import { AppSpawner, SpawnOptions, SpawnResult } from '../AppSpawner.js';
import { VirtualSessionManager, VirtualSession } from './VirtualSessionManager.js';

export interface LinuxSpawnResult extends SpawnResult {
  fallbackIdentifier?: string;
  virtualSession?: VirtualSession;
}

export class LinuxNativeSpawner implements AppSpawner {
  private activeVirtualSessions = new Map<number, VirtualSession>();

  async spawn(options: SpawnOptions): Promise<LinuxSpawnResult> {
    const { executable, args, env, requireWindowId, appName } = options;

    let virtualSession: VirtualSession | undefined;
    let spawnEnv = { ...process.env, ...env };

    // TUIKIT_HEADLESS is default '1' on Linux unless explicitly overridden
    const isHeadless = process.env.TUIKIT_HEADLESS !== '0';

    if (isHeadless) {
      virtualSession = await VirtualSessionManager.createSession();
      spawnEnv = { ...spawnEnv, ...virtualSession.envOverrides };

      // CRITICAL: We MUST scrub Wayland environment variables when using Xvfb.
      // Otherwise, modern Wayland-native terminals (Alacritty, WezTerm, Ghostty)
      // will completely ignore DISPLAY=:99 and spawn on the user's live Wayland desktop instead.
      if (virtualSession.type === 'xvfb') {
        delete spawnEnv.WAYLAND_DISPLAY;
        delete spawnEnv.XDG_SESSION_TYPE;
      }
    }

    const child = spawn(executable, args, {
      env: spawnEnv,
      detached: true,
      stdio: 'ignore',
    });

    child.unref();
    const pid = child.pid || null;
    let windowId: string | null = null;

    if (virtualSession && !pid) {
      await virtualSession.kill();
    } else if (virtualSession && pid) {
      this.activeVirtualSessions.set(pid, virtualSession);
    }

    if (requireWindowId && pid) {
      const isX11 = virtualSession ? virtualSession.type === 'xvfb' : await isX11DisplayServer();

      if (isX11 && !virtualSession) {
        windowId = await this.getX11WindowId(pid);
      }
    }

    return {
      pid,
      windowId,
      fallbackIdentifier: appName,
      virtualSession,
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

    const virtualSession = this.activeVirtualSessions.get(pid);
    if (virtualSession) {
      await virtualSession.kill();
      this.activeVirtualSessions.delete(pid);
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
