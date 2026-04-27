import { describe, expect, it } from 'vitest';
import { KittyBackend } from './KittyBackend';

describe('KittyBackend', () => {
  it('should generate correct spawn options', async () => {
    const backend = new KittyBackend({} as unknown, {} as unknown);
    (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).cols = 80;
    (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).rows = 24;

    const options = await (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).getSpawnOptions(
      '/path/to/tmux',
      'test-session',
    );

    expect(options.appName).toBe('kitty');
    expect(options.executable).toMatch(/kitty|kitty\.app/i);
    expect(options.args).toContain('--single-instance=no');
    expect(options.args).toContain('initial_window_width=80c');
    expect(options.args).toContain('initial_window_height=24c');
    expect(options.args).toContain('/path/to/tmux');
    expect(options.args).toContain('test-session');
    expect(options.requireWindowId).toBe(true);
  });
});
