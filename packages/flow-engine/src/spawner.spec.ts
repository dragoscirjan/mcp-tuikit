import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-level stubs — defined before mocks so factories can reference them
const mockExecImpl = vi.fn();
const mockExecaImpl = vi.fn();
const mockWriteFileImpl = vi.fn();

// Mock node:util so promisify(exec) resolves {stdout,stderr} not just stdout string.
// Standard promisify only captures the first extra callback arg; exec needs the object form.
vi.mock('node:util', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:util')>();
  return {
    ...original,
    promisify: (fn: unknown) => {
      if ((fn as { name?: string }).name === 'exec' || fn === mockExecImpl) {
        return (...args: unknown[]) =>
          new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
            mockExecImpl(...args, (err: Error | null, stdout: string, stderr: string) => {
              if (err) reject(err);
              else resolve({ stdout, stderr });
            });
          });
      }
      return original.promisify(fn as Parameters<typeof original.promisify>[0]);
    },
  };
});

vi.mock('node:child_process', () => ({
  exec: (...args: unknown[]) => mockExecImpl(...args),
}));

vi.mock('execa', () => ({
  execa: (...args: unknown[]) => mockExecaImpl(...args),
}));

vi.mock('node:fs/promises', () => ({
  default: {
    writeFile: (...args: unknown[]) => mockWriteFileImpl(...args),
    unlink: vi.fn().mockResolvedValue(undefined),
  },
}));

const { spawnTerminal } = await import('./spawner.js');

type ExecCallback = (error: Error | null, stdout: string, stderr: string) => void;

describe('Spawner', () => {
  const sessionName = 'test-session';

  beforeEach(() => {
    vi.resetAllMocks();

    // Default exec stub: invoke the callback with success
    mockExecImpl.mockImplementation((...args: unknown[]) => {
      const cb = args[args.length - 1] as ExecCallback;
      cb(null, '', '');
    });

    // Default execa stub: return a fake subprocess with a pid and no-op catch
    mockExecaImpl.mockReturnValue({
      pid: 12345,
      catch: vi.fn(),
    });

    // Default fs.writeFile stub
    mockWriteFileImpl.mockResolvedValue(undefined);
  });

  it('should spawn wezterm', async () => {
    vi.useFakeTimers();
    const promise = spawnTerminal('wezterm', sessionName, 120, 40);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(mockExecaImpl).toHaveBeenCalledTimes(1);
    const [bin, args] = mockExecaImpl.mock.calls[0] as [string, string[]];
    expect(bin).toContain('wezterm');
    expect(args).toContain(sessionName);
    expect(args.join(' ')).toContain('initial_cols=120');
    expect(args.join(' ')).toContain('initial_rows=40');
    expect(result.windowHandle).toBeNull();
    expect(result.pid).toBe(12345);
    vi.useRealTimers();
  });

  it('should spawn alacritty', async () => {
    vi.useFakeTimers();
    const promise = spawnTerminal('alacritty', sessionName);
    // Fast-forward the 3s startup delay
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(mockWriteFileImpl).toHaveBeenCalledTimes(1);
    expect(mockExecaImpl).toHaveBeenCalledTimes(1);
    expect(result.pid).toBe(12345);
    expect(result.tmpConfig).toMatch(/alacritty-tuikit-/);
    vi.useRealTimers();
  });

  it('should spawn ghostty', async () => {
    // Ghostty uses execAsync (open -na + pgrep), not execa.
    // Call sequence:
    //   1. pgrep -x ghostty  → empty (no existing Ghostty)
    //   2. open -na Ghostty.app --args ... → success
    //   3. [setTimeout delay — fake timers advance this]
    //   4. pgrep -x ghostty  → returns new PID 99999
    let pgrepCallCount = 0;
    mockExecImpl.mockImplementation((...args: unknown[]) => {
      const cmd = args[0] as string;
      const cb = args[args.length - 1] as ExecCallback;
      if (cmd.includes('pgrep')) {
        pgrepCallCount += 1;
        if (pgrepCallCount === 1) {
          // Before open: no existing process
          cb(Object.assign(new Error('no match'), { code: 1 }), '', '');
        } else {
          // After open: new process appeared
          cb(null, '99999\n', '');
        }
      } else {
        // open -na ... → success
        cb(null, '', '');
      }
    });

    vi.useFakeTimers();
    const promise = spawnTerminal('ghostty', sessionName, 120, 40);
    await vi.runAllTimersAsync();
    const result = await promise;

    // execa must NOT be called for ghostty
    expect(mockExecaImpl).not.toHaveBeenCalled();

    // open -na command must contain the required flags and the tmux session name
    const openCall = mockExecImpl.mock.calls.find((c) => (c[0] as string).includes('open -na'));
    expect(openCall).toBeDefined();
    const openCmd = openCall![0] as string;
    expect(openCmd).toContain('Ghostty.app');
    expect(openCmd).toContain(sessionName);
    expect(openCmd).toContain('--class=mcp-tuikit-');
    expect(openCmd).toContain('window-width=120');
    expect(openCmd).toContain('window-height=40');
    expect(openCmd).toContain('-e tmux attach -t');

    expect(result.windowHandle).toBeNull();
    expect(result.pid).toBe(99999);
    vi.useRealTimers();
  });

  it('should spawn iterm2', async () => {
    mockExecImpl.mockImplementation((...args: unknown[]) => {
      const cb = args[args.length - 1] as ExecCallback;
      cb(null, 'window-42\n', '');
    });

    const result = await spawnTerminal('iterm2', sessionName);

    expect(mockExecImpl).toHaveBeenCalledTimes(1);
    const cmd = mockExecImpl.mock.calls[0][0] as string;
    expect(cmd).toContain('osascript');
    expect(result.windowHandle).toBe('window-42');
  });

  it('should throw error for unknown backend', async () => {
    await expect(spawnTerminal('unknown-term', sessionName)).rejects.toThrow('Unknown terminal backend: unknown-term');
  });

  it('should throw error if exec fails (iterm2)', async () => {
    mockExecImpl.mockImplementation((...args: unknown[]) => {
      const cb = args[args.length - 1] as ExecCallback;
      cb(new Error('Failed to start terminal'), '', '');
    });

    await expect(spawnTerminal('iterm2', sessionName)).rejects.toThrow('Failed to start terminal');
  });
});
