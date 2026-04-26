import { describe, expect, it } from 'vitest';
import { GnomeTerminalBackend } from './GnomeTerminalBackend';

describe.runIf(process.platform === 'linux')('GnomeTerminalBackend', () => {
  it('should generate correct spawn options', async () => {
    const backend = new GnomeTerminalBackend({} as unknown, {} as unknown);
    (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).cols = 80;
    (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).rows = 24;

    const options = await (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).getSpawnOptions(
      '/path/to/tmux',
      'test-session',
    );

    expect(options.appName).toBe('GNOME Terminal');
    expect(options.executable).toBe(process.env.GNOME_TERMINAL_BIN ?? 'gnome-terminal');
    expect(options.args).toEqual([
      '--wait',
      '--hide-menubar',
      '--geometry=80x24',
      '--',
      '/path/to/tmux',
      'attach',
      '-t',
      'test-session',
    ]);
    expect(options.requireWindowId).toBe(true);
  });
});
