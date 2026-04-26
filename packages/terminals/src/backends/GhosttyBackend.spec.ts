import { describe, expect, it } from 'vitest';
import { GhosttyBackend } from './GhosttyBackend';

describe('GhosttyBackend', () => {
  it('should generate correct spawn options', async () => {
    const backend = new GhosttyBackend({} as unknown, {} as unknown);
    (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).cols = 80;
    (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).rows = 24;

    const options = await (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).getSpawnOptions(
      '/path/to/tmux',
      'test-session',
    );

    expect(options.appName).toBe('Ghostty');
    expect(options.executable).toMatch(/Ghostty\.app|ghostty/i);
    expect(options.args).toEqual([
      '--window-width=80',
      '--window-height=24',
      '-e',
      '/path/to/tmux',
      'attach',
      '-t',
      'test-session',
    ]);
    expect(options.requireWindowId).toBe(true);
  });
});
