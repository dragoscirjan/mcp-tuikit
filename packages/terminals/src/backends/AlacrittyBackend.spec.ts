import fs from 'node:fs/promises';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AlacrittyBackend } from './AlacrittyBackend';

vi.mock('node:fs/promises');

describe('AlacrittyBackend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fs.unlink as unknown).mockResolvedValue(undefined);
  });

  it('should generate correct spawn options and cleanup config', async () => {
    const backend = new AlacrittyBackend({} as unknown, {} as unknown);
    (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).cols = 80;
    (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).rows = 24;

    const options = await (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).getSpawnOptions(
      '/path/to/tmux',
      'test-session',
    );

    expect(options.appName).toBe('Alacritty');
    expect(options.executable).toMatch(/Alacritty|alacritty/i);
    expect(options.args).toHaveLength(2);
    expect(options.args[0]).toBe('--config-file');
    expect(options.args[1]).toMatch(/alacritty-tuikit-\d+\.toml/);
    expect(options.requireWindowId).toBe(true);

    expect(fs.writeFile).toHaveBeenCalledWith(options.args[1], expect.stringContaining('columns = 80'), 'utf8');
    expect(fs.writeFile).toHaveBeenCalledWith(
      options.args[1],
      expect.stringContaining('args = ["attach", "-t", "test-session"]'),
      'utf8',
    );

    // Mock super close behavior if necessary or just test cleanup directly
    // since close() calls super.close() which we might need to mock or we can just mock process
    vi.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(backend)), 'close').mockResolvedValue(undefined);

    await backend.close();
    expect(fs.unlink).toHaveBeenCalledWith(options.args[1]);
  });
});
