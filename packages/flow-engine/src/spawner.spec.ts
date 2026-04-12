/* eslint-disable @typescript-eslint/no-explicit-any */
import { exec } from 'node:child_process';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { spawnTerminal } from './spawner.js';

vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}));

describe('Spawner', () => {
  const sessionName = 'test-session';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should spawn wezterm', async () => {
    vi.mocked(exec).mockImplementation((...args: any[]) => {
      const cb = args[args.length - 1];
      cb(null, 'ok', '');
      return {} as any;
    });

    await spawnTerminal('wezterm', sessionName);
    expect(exec).toHaveBeenCalled();
  });

  it('should spawn alacritty', async () => {
    vi.mocked(exec).mockImplementation((...args: any[]) => {
      const cb = args[args.length - 1];
      cb(null, 'ok', '');
      return {} as any;
    });

    await spawnTerminal('alacritty', sessionName);
    expect(exec).toHaveBeenCalled();
  });

  it('should spawn ghostty', async () => {
    vi.mocked(exec).mockImplementation((...args: any[]) => {
      const cb = args[args.length - 1];
      cb(null, 'ok', '');
      return {} as any;
    });

    await spawnTerminal('ghostty', sessionName);
    expect(exec).toHaveBeenCalled();
  });

  it('should spawn iterm2', async () => {
    vi.mocked(exec).mockImplementation((...args: any[]) => {
      const cb = args[args.length - 1];
      cb(null, 'ok', '');
      return {} as any;
    });

    await spawnTerminal('iterm2', sessionName);
    expect(exec).toHaveBeenCalled();
  });

  it('should throw error for unknown backend', async () => {
    await expect(spawnTerminal('unknown-term', sessionName)).rejects.toThrow('Unknown terminal backend: unknown-term');
  });

  it('should throw error if exec fails', async () => {
    vi.mocked(exec).mockImplementation((...args: any[]) => {
      const cb = args[args.length - 1];
      cb(new Error('Failed to start terminal'), '', '');
      return {} as any;
    });

    await expect(spawnTerminal('wezterm', sessionName)).rejects.toThrow('Failed to start terminal');
  });
});
