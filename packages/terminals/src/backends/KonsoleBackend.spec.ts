import { describe, expect, it } from 'vitest';
import { KonsoleBackend } from './KonsoleBackend';

describe.runIf(process.platform === 'linux')('KonsoleBackend', () => {
  it('should generate correct spawn options', async () => {
    const backend = new KonsoleBackend({} as unknown, {} as unknown);
    (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).cols = 80;
    (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).rows = 24;

    const options = await (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).getSpawnOptions(
      '/path/to/tmux',
      'test-session',
    );

    expect(options.appName).toBe('Konsole');
    expect(options.executable).toBe(process.env.KONSOLE_BIN ?? 'konsole');
    expect(options.args).toEqual([
      '--separate',
      '--hide-menubar',
      '--hide-tabbar',
      '-p',
      'TerminalColumns=80',
      '-p',
      'TerminalRows=24',
      '-e',
      '/path/to/tmux',
      'attach',
      '-t',
      'test-session',
    ]);
    expect(options.requireWindowId).toBe(true);
  });
});
