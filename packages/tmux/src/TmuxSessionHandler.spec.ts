import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-level stubs
const mockExecImpl = vi.fn();

// We need execAsync (promisify(exec)) to resolve {stdout, stderr}.
// Standard promisify only captures the first extra arg, not an object.
// Solution: mock node:util so that promisify(exec) returns our own async wrapper.
vi.mock('node:util', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:util')>();
  return {
    ...original,
    promisify: (fn: unknown) => {
      // Only intercept promisify(exec) — pass everything else through
      if (fn === mockExecImpl || (fn as { name?: string }).name === 'exec') {
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

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    exec: (...args: unknown[]) => mockExecImpl(...args),
  };
});

const { TmuxSessionHandler } = await import('./TmuxSessionHandler.js');

type ExecCallback = (error: Error | null, stdout: string, stderr: string) => void;

describe('TmuxSessionHandler', () => {
  let backend: InstanceType<typeof TmuxSessionHandler>;

  beforeEach(() => {
    vi.resetAllMocks();
    // Default: succeed with empty output
    mockExecImpl.mockImplementation((...args: unknown[]) => {
      const cb = args[args.length - 1] as ExecCallback;
      cb(null, '', '');
    });
    backend = new TmuxSessionHandler();
  });

  it('createSession calls exec with the right tmux CLI arguments', async () => {
    const sessionId = await backend.createSession('bash', 80, 24);

    expect(mockExecImpl).toHaveBeenCalledTimes(1);

    const cmdArg = mockExecImpl.mock.calls[0][0] as string;
    // Session ID uses nanoid(8): URL-safe chars [A-Za-z0-9_-]
    expect(cmdArg).toMatch(/^tmux new-session -d -s mcp-[A-Za-z0-9_-]{8} -x 80 -y 24 "bash"$/);
    expect(sessionId).toMatch(/^mcp-[A-Za-z0-9_-]{8}$/);
  });

  it('sendKeys calls exec with the right tmux CLI arguments', async () => {
    await backend.sendKeys('my-session', 'ls -la');

    expect(mockExecImpl).toHaveBeenCalledTimes(1);
    const cmdArg = mockExecImpl.mock.calls[0][0] as string;
    expect(cmdArg).toBe('tmux send-keys -t my-session "ls -la"');
  });

  it('getScreenPlaintext calls exec with the right tmux CLI arguments', async () => {
    mockExecImpl.mockImplementation((...args: unknown[]) => {
      const cb = args[args.length - 1] as ExecCallback;
      cb(null, 'line 1\nline 2\n\n', '');
    });

    const output = await backend.getScreenPlaintext('my-session', 0);

    expect(mockExecImpl).toHaveBeenCalledTimes(1);
    const cmdArg = mockExecImpl.mock.calls[0][0] as string;
    expect(cmdArg).toBe('tmux capture-pane -p -t my-session');
    expect(output).toBe('line 1\nline 2');
  });

  it('getScreenPlaintext with maxLines trims the output', async () => {
    mockExecImpl.mockImplementation((...args: unknown[]) => {
      const cb = args[args.length - 1] as ExecCallback;
      cb(null, 'line 1\nline 2\nline 3\nline 4\n', '');
    });

    const output = await backend.getScreenPlaintext('my-session', 2);
    expect(output).toBe('line 3\nline 4');
  });
});
