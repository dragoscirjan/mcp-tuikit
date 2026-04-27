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
const { OsascriptSpawnedBackend, runAppleScriptSpawn, runAppleScriptClose, spawnAppleScriptTerminal } =
  await import('./OsascriptSpawnedBackend.js');
const { SessionHandler, SnapshotStrategy } = await import('../index.js');
type IdType = string;

type ExecCallback = (error: Error | null, stdout: string, stderr: string) => void;

class DummyOsascriptBackend extends OsascriptSpawnedBackend {
  protected get appName(): string {
    return 'DummyApp';
  }

  protected get generateFocusCmd(): string {
    return 'focus target window';
  }

  protected generateSpawnCmd(tmuxCmd: string): string {
    return `spawn with ${tmuxCmd}`;
  }

  protected generateCloseCmd(windowId: IdType): string {
    return `close window ${windowId}`;
  }
}

describe('OsascriptSpawnedBackend standalone functions', () => {
  beforeEach(() => {
    mockExecImpl.mockReset();
    mockExecImpl.mockImplementation((...args: unknown[]) => {
      const cmd = args[0] as string;
      const cb = args[args.length - 1] as ExecCallback;
      if (cmd.includes('which tmux')) {
        cb(null, '/usr/bin/tmux\n', '');
      } else if (cmd.includes('osascript')) {
        cb(null, 'win-123\n', '');
      } else {
        cb(null, 'mock-output\n', '');
      }
    });
  });

  it('runAppleScriptSpawn executes osascript with formatted script', async () => {
    const winId = await runAppleScriptSpawn('TestApp', 'spawn-cmd', 800, 600, 'focus-cmd');
    expect(winId).toBe('win-123');
    expect(mockExecImpl).toHaveBeenCalledWith(expect.stringContaining('osascript -e'), expect.any(Function));
    const callCmd = mockExecImpl.mock.calls.find((c) => (c[0] as string).includes('osascript -e'))![0] as string;
    expect(callCmd).toContain('TestApp');
    expect(callCmd).toContain('spawn-cmd');
    expect(callCmd).toContain('focus-cmd');
    expect(callCmd).toContain('{0, 0, 800, 600}');
  });

  it('runAppleScriptClose executes osascript with close cmd', async () => {
    await runAppleScriptClose('TestApp', 'close-cmd');
    const callCmd = mockExecImpl.mock.calls.find((c) => (c[0] as string).includes('osascript -e'))![0] as string;
    expect(callCmd).toContain('tell application "TestApp"');
    expect(callCmd).toContain('close-cmd');
  });

  it('spawnAppleScriptTerminal throws if no session ID', async () => {
    await expect(spawnAppleScriptTerminal(null, 100, 100, 'App', () => 'spawn', 'focus')).rejects.toThrow(
      'Cannot spawn App without an active session ID',
    );
  });

  it('spawnAppleScriptTerminal resolves windowId and applies startup delay', async () => {
    vi.useFakeTimers();
    const spawnPromise = spawnAppleScriptTerminal('sess-1', 100, 100, 'App', (cmd: string) => cmd, 'focus');

    await vi.runAllTimersAsync();
    const result = await spawnPromise;
    expect(result).toBe('win-123');
    vi.useRealTimers();
  });
});

describe('OsascriptSpawnedBackend class', () => {
  let sessionHandler: import('vitest').Mocked<typeof SessionHandler.prototype>;
  let snapshotStrategy: import('vitest').Mocked<typeof SnapshotStrategy.prototype>;
  let backend: DummyOsascriptBackend;

  beforeEach(() => {
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

    backend = new DummyOsascriptBackend(sessionHandler, snapshotStrategy);

    mockExecImpl.mockReset();
    mockExecImpl.mockImplementation((...args: unknown[]) => {
      const cmd = args[0] as string;
      const cb = args[args.length - 1] as ExecCallback;
      if (cmd.includes('which tmux')) {
        cb(null, '/usr/bin/tmux\n', '');
      } else if (cmd.includes('osascript')) {
        cb(null, 'win-123\n', '');
      } else {
        cb(null, 'mock-output\n', '');
      }
    });
  });

  it('spawn sets windowId via osascript', async () => {
    (backend as unknown as Record<string, unknown>)._sessionName = 'sess-789';

    vi.useFakeTimers();
    const spawnPromise = backend.spawn();
    await vi.runAllTimersAsync();
    await spawnPromise;
    vi.useRealTimers();

    expect(backend.windowId).toBe('win-123');
  });

  it('close runs AppleScript close if windowId exists', async () => {
    (backend as unknown as Record<string, unknown>)._windowId = 'win-to-close';

    await backend.close();
    expect(mockExecImpl).toHaveBeenCalledWith(
      expect.stringContaining('close window win-to-close'),
      expect.any(Function),
    );
  });
});
