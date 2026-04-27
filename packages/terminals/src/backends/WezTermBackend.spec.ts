import { describe, expect, it } from 'vitest';
import { WezTermBackend } from './WezTermBackend';

describe('WezTermBackend', () => {
  it('should generate correct spawn options', async () => {
    const backend = new WezTermBackend({} as unknown, {} as unknown);
    (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).cols = 80;
    (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).rows = 24;

    const options = await (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).getSpawnOptions(
      '/path/to/tmux',
      'test-session',
    );

    expect(options.appName).toBe('WezTerm');
    expect(options.executable).toMatch(/wezterm-gui|wezterm/i);
    expect(options.args).toEqual([
      '--config',
      'initial_cols=80',
      '--config',
      'initial_rows=24',
      'start',
      '--always-new-process',
      '--',
      '/path/to/tmux',
      'attach',
      '-t',
      'test-session',
    ]);
    expect(options.requireWindowId).toBe(true);
  });
});
