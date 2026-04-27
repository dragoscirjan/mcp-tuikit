import { promisify } from 'node:util';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecImpl = vi.fn();

function mockExecWithCustomPromisify(...args: unknown[]) {
  return mockExecImpl(...args);
}
(mockExecWithCustomPromisify as unknown as Record<symbol, unknown>)[promisify.custom] = (cmd: string) => {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    mockExecImpl(cmd, (err: Error | null, stdout: string, stderr: string) => {
      if (err) reject(err);
      else resolve({ stdout, stderr });
    });
  });
};

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    exec: mockExecWithCustomPromisify,
    execFile: vi.fn(),
  };
});

// Import AFTER the mock is set up
const { ShellSpawnedBackend } = await import('./ShellSpawnedBackend.js');
const { SessionHandler, AppSpawner } = await import('@mcp-tuikit/core');
const { SnapshotStrategy } = await import('./SnapshotStrategy.js');
type SpawnOptions = import('@mcp-tuikit/core').SpawnOptions;
type ExecCallback = (error: Error | null, stdout: string, stderr: string) => void;

class DummyShellBackend extends ShellSpawnedBackend {
  public async getSpawnOptions(tmuxAbsPath: string, sessionName: string): Promise<SpawnOptions> {
    return {
      appName: 'DummyApp',
      executable: 'dummy',
      args: ['--tmux', tmuxAbsPath, '--session', sessionName],
    };
  }
}

describe('ShellSpawnedBackend', () => {
  let sessionHandler: import('vitest').Mocked<typeof SessionHandler.prototype>;
  let snapshotStrategy: import('vitest').Mocked<typeof SnapshotStrategy.prototype>;
  let spawner: import('vitest').Mocked<typeof AppSpawner.prototype>;
  let backend: DummyShellBackend;

  beforeEach(() => {
    mockExecImpl.mockReset();
    mockExecImpl.mockImplementation((...args: unknown[]) => {
      const cmd = args[0] as string;
      const cb = args[args.length - 1] as ExecCallback;
      if (cmd.includes('which tmux') || cmd.includes('where.exe tmux')) {
        cb(null, '/usr/bin/tmux\n', '');
      } else {
        cb(null, 'mock-output\n', '');
      }
    });

    sessionHandler = {
      createSession: vi.fn().mockResolvedValue('test-session'),
      getScreenPlaintext: vi.fn(),
      sendKeys: vi.fn(),
      waitForText: vi.fn(),
      destroySession: vi.fn(),
    } as unknown as import('vitest').Mocked<typeof SessionHandler.prototype>;

    snapshotStrategy = {
      capture: vi.fn(),
    } as unknown as import('vitest').Mocked<typeof SnapshotStrategy.prototype>;

    spawner = {
      spawn: vi.fn().mockResolvedValue({ pid: 1234, windowId: 'win-5678' }),
      kill: vi.fn().mockResolvedValue(undefined),
    } as unknown as import('vitest').Mocked<typeof AppSpawner.prototype>;

    backend = new DummyShellBackend(sessionHandler, snapshotStrategy, spawner);
  });

  it('should throw if spawn is called without an active session', async () => {
    await expect(backend.spawn()).rejects.toThrow('Cannot spawn backend without an active session ID');
  });

  it('should spawn the app using the provided spawner', async () => {
    (backend as unknown as Record<string, unknown>)._sessionName = 'test-session';

    await backend.spawn();

    expect(spawner.spawn).toHaveBeenCalledWith({
      appName: 'DummyApp',
      executable: 'dummy',
      args: ['--tmux', '/usr/bin/tmux', '--session', 'test-session'],
    });

    expect(backend.processId).toBe('1234');
    expect(backend.windowId).toBe('win-5678');
  });

  it('should kill the spawned process on close', async () => {
    (backend as unknown as Record<string, unknown>)._sessionName = 'test-session';
    await backend.spawn();

    await backend.close();
    expect(spawner.kill).toHaveBeenCalledWith(1234);
  });

  it('should handle kill rejection silently on close', async () => {
    (backend as unknown as Record<string, unknown>)._sessionName = 'test-session';
    await backend.spawn();

    spawner.kill.mockRejectedValueOnce(new Error('Process not found'));
    await expect(backend.close()).resolves.not.toThrow();
  });
});
