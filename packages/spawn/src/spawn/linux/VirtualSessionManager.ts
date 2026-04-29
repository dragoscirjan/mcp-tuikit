import { spawn } from 'node:child_process';
import { execa } from 'execa';

export interface VirtualSession {
  type: 'xvfb' | 'sway' | 'kwin';
  envOverrides: NodeJS.ProcessEnv;
  pid: number;
  display: string;
  kill: () => Promise<void>;
}

export class VirtualSessionManager {
  /**
   * Spawns a headless virtual session based on available system tools.
   * Tries Xvfb -> sway -> kwin_wayland.
   * If none are available, throws a detailed error for the LLM to provide an installation command.
   */
  static async createSession(): Promise<VirtualSession> {
    if (await this.hasCommand('Xvfb')) {
      return this.createXvfbSession();
    }

    if (await this.hasCommand('sway')) {
      return this.createSwaySession();
    }

    if (await this.hasCommand('kwin_wayland')) {
      return this.createKwinSession();
    }

    throw new Error(
      'No headless virtual compositor found. ' +
        'To run mcp-tuikit headlessly on Linux, please install one of the following:\n' +
        '- Xvfb (Recommended, Universal): sudo apt-get install xvfb\n' +
        '- sway (Wayland): sudo apt-get install sway grim\n' +
        '- kwin_wayland (KDE)',
    );
  }

  private static async hasCommand(cmd: string): Promise<boolean> {
    try {
      await execa('which', [cmd]);
      return true;
    } catch {
      return false;
    }
  }

  private static async createXvfbSession(): Promise<VirtualSession> {
    return new Promise((resolve, reject) => {
      // Use displayfd 3 so Xvfb picks the first available display and reports it to us.
      const xvfb = spawn('Xvfb', ['-displayfd', '3', '-screen', '0', '1920x1080x24'], {
        stdio: ['ignore', 'ignore', 'ignore', 'pipe'],
        detached: true,
      });

      let displayNum = '';

      xvfb.stdio[3]!.on('data', (data: Buffer) => {
        displayNum += data.toString();
        const display = `:${displayNum.trim()}`;

        // Once we get the display string, resolve the promise.
        resolve({
          type: 'xvfb',
          envOverrides: { DISPLAY: display },
          pid: xvfb.pid!,
          display,
          kill: async () => {
            try {
              process.kill(xvfb.pid!, 'SIGTERM');
            } catch (err) {
              if ((err as NodeJS.ErrnoException).code !== 'ESRCH') {
                console.error(`Failed to kill Xvfb (${xvfb.pid}):`, err);
              }
            }
          },
        });
      });

      xvfb.on('error', (err) => {
        reject(new Error(`Failed to start Xvfb: ${err.message}`));
      });

      xvfb.on('exit', (code) => {
        if (!displayNum) {
          reject(new Error(`Xvfb exited early with code ${code}`));
        }
      });
    });
  }

  private static async createSwaySession(): Promise<VirtualSession> {
    return new Promise((resolve, reject) => {
      let resolved = false;
      const sway = spawn('sway', ['-d', '-c', '/dev/null'], {
        env: { ...process.env, WLR_BACKENDS: 'headless' },
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true,
      });

      let display = '';

      sway.stderr.on('data', (data: Buffer) => {
        if (resolved) return;
        const str = data.toString();
        const match = str.match(/Running compositor on wayland display '([^']+)'/);
        if (match) {
          display = match[1];
          resolved = true;
          resolve({
            type: 'sway',
            envOverrides: { WAYLAND_DISPLAY: display },
            pid: sway.pid!,
            display,
            kill: async () => {
              try {
                process.kill(sway.pid!, 'SIGTERM');
              } catch (err) {
                if ((err as NodeJS.ErrnoException).code !== 'ESRCH') {
                  console.error(`Failed to kill sway (${sway.pid}):`, err);
                }
              }
            },
          });
        }
      });

      setTimeout(() => {
        if (!resolved) {
          if (sway.exitCode !== null) {
            reject(new Error(`Sway exited early with code ${sway.exitCode}`));
          } else {
            reject(new Error('Sway started but failed to report WAYLAND_DISPLAY within timeout.'));
            sway.kill();
          }
        }
      }, 3000);
    });
  }

  private static async createKwinSession(): Promise<VirtualSession> {
    return new Promise((resolve, reject) => {
      const socketName = `wayland-kwin-${Date.now()}`;
      const kwin = spawn('kwin_wayland', ['--virtual', '--socket', socketName], {
        env: { ...process.env },
        stdio: 'ignore',
        detached: true,
      });

      setTimeout(() => {
        if (kwin.exitCode !== null) {
          reject(new Error(`kwin_wayland exited early with code ${kwin.exitCode}`));
          return;
        }

        resolve({
          type: 'kwin',
          envOverrides: { WAYLAND_DISPLAY: socketName },
          pid: kwin.pid!,
          display: socketName,
          kill: async () => {
            try {
              process.kill(kwin.pid!, 'SIGTERM');
            } catch (err) {
              if ((err as NodeJS.ErrnoException).code !== 'ESRCH') {
                console.error(`Failed to kill kwin (${kwin.pid}):`, err);
              }
            }
          },
        });
      }, 1000);
    });
  }
}
