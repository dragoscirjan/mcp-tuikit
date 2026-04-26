import { describe, expect, it } from 'vitest';
import { PowershellBackend } from './PowershellBackend';

describe.runIf(process.platform === 'win32')('PowershellBackend', () => {
  it('should generate correct spawn options with default executable', async () => {
    const backend = new PowershellBackend({} as unknown, {} as unknown, {} as unknown);
    (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).cols = 80;
    (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).rows = 24;

    const options = await (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).getSpawnOptions(
      '/path/to/tmux',
      'test-session',
    );

    expect(options.appName).toBe('PowerShell');
    expect(options.executable).toBe('powershell.exe');
    expect(options.args).toEqual([
      '-NoProfile',
      '-WindowStyle',
      'Normal',
      '-Command',
      '& { mode con: cols=80 lines=24; & "/path/to/tmux" attach -t "test-session" }',
    ]);
    expect(options.requireWindowId).toBe(true);
  });

  it('should allow custom executable', async () => {
    const backend = new PowershellBackend({} as unknown, {} as unknown, {} as unknown, 'pwsh.exe');
    (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).cols = 100;
    (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).rows = 30;

    const options = await (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).getSpawnOptions(
      'tmux',
      's',
    );
    expect(options.executable).toBe('pwsh.exe');
  });
});
