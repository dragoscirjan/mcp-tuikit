import { describe, expect, it } from 'vitest';
import { WindowsTerminalBackend } from './WindowsTerminalBackend';

describe.runIf(process.platform === 'win32')('WindowsTerminalBackend', () => {
  it('should generate correct spawn options', async () => {
    const backend = new WindowsTerminalBackend({} as unknown, {} as unknown);
    (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).cols = 80;
    (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).rows = 24;

    const options = await (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).getSpawnOptions(
      '/path/to/tmux',
      'test-session',
    );

    expect(options.appName).toBe('Windows Terminal');
    expect(options.executable).toBe('wt.exe');
    expect(options.args).toEqual([
      '-w',
      '-1',
      '--size',
      '80,24',
      'new-tab',
      '--title',
      'tuikit-test-session',
      '/path/to/tmux',
      'attach',
      '-t',
      'test-session',
    ]);
    expect(options.requireWindowId).toBe(true);
  });
});
