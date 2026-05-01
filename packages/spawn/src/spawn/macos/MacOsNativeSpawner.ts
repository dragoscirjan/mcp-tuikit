import { execa } from 'execa';
import { AppSpawner, SpawnOptions, SpawnResult } from '../AppSpawner.js';
import { waitForWindowId } from './getWindowId.js';

export class MacOsNativeSpawner implements AppSpawner {
  async spawn(options: SpawnOptions): Promise<SpawnResult> {
    const { executable, args, env, requireWindowId } = options;

    const proc = execa(executable, args, {
      detached: true,
      env,
      stdio: 'ignore',
    });

    // We don't await the process promise here because it stays running
    // The child_process is detached. We catch the promise so that when
    // it's killed later, it doesn't cause an UnhandledPromiseRejection.
    proc.catch(() => {});

    // We need the pid immediately
    const pid = proc.pid;
    if (pid === undefined) {
      throw new Error(`Failed to spawn process: ${executable}`);
    }

    let windowId: string | null = null;

    if (requireWindowId) {
      // Wait up to 5 seconds for the window to become visible and query its ID
      windowId = await waitForWindowId(pid, 5000);
    }

    return {
      pid,
      windowId,
    };
  }

  // jscpd:ignore-start
  async kill(pid: number): Promise<void> {
    try {
      process.kill(-pid, 'SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 500));
      process.kill(-pid, 'SIGKILL');
    } catch {
      try {
        process.kill(pid, 'SIGTERM');
        await new Promise((resolve) => setTimeout(resolve, 500));
        process.kill(pid, 'SIGKILL');
      } catch {
        // Process likely already dead
      }
    }
  }
  // jscpd:ignore-end
}
