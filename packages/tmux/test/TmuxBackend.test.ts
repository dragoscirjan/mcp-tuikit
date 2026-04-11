import { exec } from 'node:child_process';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TmuxBackend } from '../src/TmuxBackend.js';

vi.mock('node:child_process', () => {
  return {
    exec: vi.fn((cmd, cb) => {
      cb(null, { stdout: '', stderr: '' });
    }),
  };
});

describe('TmuxBackend', () => {
  let backend: TmuxBackend;

  beforeEach(() => {
    vi.clearAllMocks();
    backend = new TmuxBackend();
  });

  it('createSession calls exec with the right tmux CLI arguments', async () => {
    const sessionId = await backend.createSession('bash', 80, 24);

    expect(exec).toHaveBeenCalledTimes(1);

    const cmdArg = vi.mocked(exec).mock.calls[0][0];
    expect(cmdArg).toMatch(/^tmux new-session -d -s mcp-\d+ -x 80 -y 24 "bash"$/);
    expect(sessionId).toMatch(/^mcp-\d+$/);
  });

  it('sendKeys calls exec with the right tmux CLI arguments', async () => {
    await backend.sendKeys('my-session', 'ls -la');

    expect(exec).toHaveBeenCalledTimes(1);
    expect(exec).toHaveBeenCalledWith('tmux send-keys -t my-session "ls -la"', expect.any(Function));
  });

  it('getScreenPlaintext calls exec with the right tmux CLI arguments', async () => {
    vi.mocked(exec).mockImplementation(
      (cmd, cb: (err: Error | null, res: { stdout: string; stderr: string }) => void) => {
        cb(null, { stdout: 'line 1\nline 2\n\n' });
      },
    );

    const output = await backend.getScreenPlaintext('my-session', 0);

    expect(exec).toHaveBeenCalledTimes(1);
    expect(exec).toHaveBeenCalledWith('tmux capture-pane -p -t my-session', expect.any(Function));
    expect(output).toBe('line 1\nline 2');
  });

  it('getScreenPlaintext with maxLines trims the output', async () => {
    vi.mocked(exec).mockImplementation(
      (cmd, cb: (err: Error | null, res: { stdout: string; stderr: string }) => void) => {
        cb(null, { stdout: 'line 1\nline 2\nline 3\nline 4\n' });
      },
    );

    const output = await backend.getScreenPlaintext('my-session', 2);
    expect(output).toBe('line 3\nline 4');
  });
});
