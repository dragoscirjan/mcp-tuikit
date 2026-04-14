import { execa } from 'execa';
import { AppSpawner, SpawnOptions, SpawnResult } from '../AppSpawner.js';
import { waitForWindowId } from './getWindowId.js';

export class MacOsOpenSpawner implements AppSpawner {
  async spawn(options: SpawnOptions): Promise<SpawnResult> {
    const { executable, args, appName, env, requireWindowId } = options;

    // Use `open -n -a` to launch the application
    // -n: Open a new instance
    // -a: Specify the application name
    const openArgs = ['-n', '-a', executable];
    if (args && args.length > 0) {
      openArgs.push('--args', ...args);
    }

    // Get PIDs before spawn
    let pidsBefore = new Set<number>();
    try {
      const { stdout } = await execa('pgrep', ['-x', appName]);
      pidsBefore = new Set(
        stdout
          .trim()
          .split('\n')
          .map(Number)
          .filter((n) => !isNaN(n) && n > 0),
      );
    } catch {
      // pgrep exits with 1 if no processes found, which throws in execa
    }

    // Spawn the app
    await execa('open', openArgs, { env, stdio: 'ignore' });

    // Give the app a moment to start
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get PIDs after spawn
    let newPid: number | null = null;
    try {
      const { stdout } = await execa('pgrep', ['-x', appName]);
      const pidsAfter = stdout
        .trim()
        .split('\n')
        .map(Number)
        .filter((n) => !isNaN(n) && n > 0);

      // Find the first PID that wasn't there before
      newPid = pidsAfter.find((p) => !pidsBefore.has(p)) || null;
    } catch {
      // Ignore
    }

    let windowId: string | null = null;

    if (requireWindowId && newPid) {
      // Wait up to 5 seconds for the window to become visible
      windowId = await waitForWindowId(newPid, 5000);
    }

    return {
      pid: newPid,
      windowId,
    };
  }

  async kill(pid: number): Promise<void> {
    try {
      process.kill(pid, 'SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 500));
      process.kill(pid, 'SIGKILL');
    } catch {
      // Process likely already dead
    }
  }
}
