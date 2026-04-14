import { promisify } from 'node:util';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We mock child_process with a factory so promisify(exec) works correctly.
// The factory installs vi.fn() for execFile and exec before the module under test loads.
//
// IMPORTANT: Node's real `exec` has a [util.promisify.custom] symbol so promisify(exec)
// returns { stdout, stderr }. Our mock must replicate that so `const { stdout } = await execAsync(...)`
// doesn't get `undefined`.

const mockExecFileImpl = vi.fn();
const mockExecImpl = vi.fn();

// Build a wrapper that attaches the promisify.custom symbol so that
// `promisify(mockExec)` resolves with `{ stdout, stderr }` just like the real exec.
function mockExecWithCustomPromisify(...args: unknown[]) {
  return mockExecImpl(...args);
}
(mockExecWithCustomPromisify as unknown as Record<symbol, unknown>)[promisify.custom] = (cmd: string) => {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    // The last positional arg might be options; we ignore it here.
    mockExecImpl(cmd, (err: Error | null, stdout: string, stderr: string) => {
      if (err) reject(err);
      else resolve({ stdout, stderr });
    });
  });
};

vi.mock('node:child_process', () => ({
  execFile: (...args: unknown[]) => mockExecFileImpl(...args),
  exec: mockExecWithCustomPromisify,
}));

// Import AFTER the mock is set up
const { captureMacOsWindow, MacOsSnapshotStrategy } = await import('./macos.js');

type ExecFileCallback = (error: Error | null, stdout: string, stderr: string) => void;
type ExecCallback = (error: Error | null, stdout: string, stderr: string) => void;

describe('captureMacOsWindow', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Default exec stub: used by execAsync(promisify(exec))
    // Called as exec(cmd, callback) or exec(cmd, options, callback)
    mockExecImpl.mockImplementation((...args: unknown[]) => {
      const cb = args[args.length - 1] as ExecCallback;
      cb(null, '', '');
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('captures a window via osascript when iTerm is the app', async () => {
    // osascript returns window ID, screencapture succeeds
    mockExecFileImpl.mockImplementation((...args: unknown[]) => {
      const file = args[0] as string;
      const cb = args[args.length - 1] as ExecFileCallback;
      if (file === 'osascript') {
        cb(null, '12345\n', '');
      } else if (file === 'screencapture') {
        cb(null, '', '');
      } else {
        cb(new Error(`Unexpected: ${file}`), '', '');
      }
    });

    await expect(captureMacOsWindow('iTerm', '/tmp/output.png')).resolves.toBeUndefined();

    expect(mockExecFileImpl).toHaveBeenCalledWith('osascript', expect.any(Array), expect.any(Function));
    expect(mockExecFileImpl).toHaveBeenCalledWith(
      'screencapture',
      expect.arrayContaining(['-l', '12345', '/tmp/output.png']),
      expect.any(Function),
    );
  });

  it('throws timeout error when osascript continuously fails', async () => {
    mockExecFileImpl.mockImplementation((...args: unknown[]) => {
      const file = args[0] as string;
      const cb = args[args.length - 1] as ExecFileCallback;
      if (file === 'osascript') {
        cb(new Error('execution error'), '', '');
      } else {
        cb(new Error(`Unexpected: ${file}`), '', '');
      }
    });

    await expect(captureMacOsWindow('iTerm', '/tmp/output.png', 50, 10)).rejects.toThrow(/Timeout waiting for window/);
  });

  it('throws when screencapture fails after retries', async () => {
    mockExecFileImpl.mockImplementation((...args: unknown[]) => {
      const file = args[0] as string;
      const cb = args[args.length - 1] as ExecFileCallback;
      if (file === 'osascript') {
        cb(null, '12345\n', '');
      } else if (file === 'screencapture') {
        cb(new Error('screencapture failed'), '', 'permission denied');
      } else {
        cb(new Error(`Unexpected: ${file}`), '', '');
      }
    });

    await expect(captureMacOsWindow('iTerm', '/tmp/output.png')).rejects.toThrow(/Failed to capture window/);
  });

  it('times out when the window never appears', async () => {
    mockExecFileImpl.mockImplementation((...args: unknown[]) => {
      const file = args[0] as string;
      const cb = args[args.length - 1] as ExecFileCallback;
      if (file === 'osascript') {
        cb(new Error('window not found'), '', '');
      } else {
        cb(new Error(`Unexpected: ${file}`), '', '');
      }
    });

    await expect(captureMacOsWindow('iTerm', '/tmp/output.png', 50, 10)).rejects.toThrow(/Timeout waiting for window/);
  });

  it.each(['Alacritty', 'WezTerm', 'Ghostty'])(
    'captures a window via CGWindowList (Swift) for %s',
    async (appName) => {
      // exec is used for the Swift CGWindowList script AND for open -a activation
      mockExecImpl.mockImplementation((...args: unknown[]) => {
        const cmd = args[0] as string;
        const cb = args[args.length - 1] as ExecCallback;
        if (cmd.includes('swift')) {
          // CGWindowList script — return a valid window ID
          cb(null, '99999\n', '');
        } else {
          // open -a activation — succeed silently
          cb(null, '', '');
        }
      });

      mockExecFileImpl.mockImplementation((...args: unknown[]) => {
        const file = args[0] as string;
        const cb = args[args.length - 1] as ExecFileCallback;
        if (file === 'screencapture') {
          cb(null, '', '');
        } else {
          cb(new Error(`Unexpected execFile call: ${file}`), '', '');
        }
      });

      // Pass a very short timeout so delays in the function don't block;
      // the mock returns a valid window ID on the first poll so the while-loop
      // exits immediately and the internal 500ms delay is the only async pause.
      // We resolve it by using a real-timers approach with a generous test timeout.
      await expect(captureMacOsWindow(appName, '/tmp/output.png', 5000, 10)).resolves.toBeUndefined();

      // osascript must NOT have been called — CGWindowList path only
      const osascriptCalls = (mockExecFileImpl.mock.calls as unknown[][]).filter((c) => c[0] === 'osascript');
      expect(osascriptCalls).toHaveLength(0);

      // screencapture must have been called with the window ID
      expect(mockExecFileImpl).toHaveBeenCalledWith(
        'screencapture',
        expect.arrayContaining(['-l', '99999', '/tmp/output.png']),
        expect.any(Function),
      );
    },
    10_000, // test timeout — allow the 500ms real delay
  );

  it.each(['Alacritty', 'WezTerm', 'Ghostty'])('times out waiting for CGWindowList window for %s', async (appName) => {
    mockExecImpl.mockImplementation((...args: unknown[]) => {
      const cmd = args[0] as string;
      const cb = args[args.length - 1] as ExecCallback;
      if (cmd.includes('swift')) {
        // No window found — empty output
        cb(null, '', '');
      } else {
        cb(null, '', '');
      }
    });

    await expect(captureMacOsWindow(appName, '/tmp/output.png', 50, 10)).rejects.toThrow(/Timeout waiting for window/);
  });
});

describe('MacOsSnapshotStrategy', () => {
  it('delegates capture() to captureMacOsWindow with the configured app name', async () => {
    mockExecFileImpl.mockImplementation((...args: unknown[]) => {
      const file = args[0] as string;
      const cb = args[args.length - 1] as ExecFileCallback;
      if (file === 'osascript') {
        cb(null, '42\n', '');
      } else if (file === 'screencapture') {
        cb(null, '', '');
      } else {
        cb(new Error(`Unexpected: ${file}`), '', '');
      }
    });

    const snapshotter = new MacOsSnapshotStrategy('iTerm');
    await expect(snapshotter.capture('/tmp/snap.png', 80, 24, 'tuikit_abc')).resolves.toBeUndefined();

    // screencapture must have been invoked — confirming the delegation worked
    expect(mockExecFileImpl).toHaveBeenCalledWith(
      'screencapture',
      expect.arrayContaining(['-l', '42', '/tmp/snap.png']),
      expect.any(Function),
    );
  });
});
