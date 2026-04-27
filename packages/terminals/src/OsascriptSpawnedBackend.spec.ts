import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecaImpl = vi.fn();

vi.mock('execa', () => {
  return {
    execa: (...args: unknown[]) => mockExecaImpl(...args),
  };
});

// Import AFTER the mock is set up
const { OsascriptSpawnedBackend, runAppleScriptSpawn, runAppleScriptClose, spawnAppleScriptTerminal } =
  await import('./OsascriptSpawnedBackend.js');
const { SessionHandler } = await import('@mcp-tuikit/core');
const { SnapshotStrategy } = await import('./SnapshotStrategy.js');
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
    mockExecaImpl.mockReset();
    mockExecaImpl.mockImplementation(async (bin: string, args: string[] = []) => {
      const fullCmd = `${bin} ${args.join(' ')}`;
      if (fullCmd.includes('which tmux')) {
        return { stdout: '/usr/bin/tmux\n' };
      } else if (fullCmd.includes('osascript')) {
        return { stdout: 'win-123\n' };
      } else {
        return { stdout: 'mock-output\n' };
      }
    });
  });

  it('runAppleScriptSpawn executes osascript with formatted script', async () => {
    const winId = await runAppleScriptSpawn('TestApp', 'spawn-cmd', 800, 600, 'focus-cmd');
    expect(winId).toBe('win-123');
    expect(mockExecaImpl).toHaveBeenCalledWith('osascript', ['-e', expect.any(String)]);
    const callCmdArgs = mockExecaImpl.mock.calls.find((c) => c[0] === 'osascript')![1] as string[];
    const scriptArg = callCmdArgs[1];
    expect(scriptArg).toContain('TestApp');
    expect(scriptArg).toContain('spawn-cmd');
    expect(scriptArg).toContain('focus-cmd');
    expect(scriptArg).toContain('{0, 0, 800, 600}');
  });

  it('runAppleScriptClose executes osascript with close cmd', async () => {
    await runAppleScriptClose('TestApp', 'close-cmd');
    const callCmdArgs = mockExecaImpl.mock.calls.find((c) => c[0] === 'osascript')![1] as string[];
    const scriptArg = callCmdArgs[1];
    expect(scriptArg).toContain('tell application "TestApp"');
    expect(scriptArg).toContain('close-cmd');
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

    mockExecaImpl.mockReset();
    mockExecaImpl.mockImplementation(async (bin: string, args: string[] = []) => {
      const fullCmd = `${bin} ${args.join(' ')}`;
      if (fullCmd.includes('which tmux')) {
        return { stdout: '/usr/bin/tmux\n' };
      } else if (fullCmd.includes('osascript')) {
        return { stdout: 'win-123\n' };
      } else {
        return { stdout: 'mock-output\n' };
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
    expect(mockExecaImpl).toHaveBeenCalledWith('osascript', ['-e', expect.stringContaining('close window win-to-close')]);
  });
});
