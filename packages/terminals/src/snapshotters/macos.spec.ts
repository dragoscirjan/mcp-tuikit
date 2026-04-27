import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockExecaImpl = vi.fn();

vi.mock('execa', () => {
  return {
    execa: (...args: unknown[]) => mockExecaImpl(...args),
  };
});

// Import AFTER the mock is set up
const { captureMacOsWindow, MacOsSnapshotStrategy } = await import('./macos.js');

describe('captureMacOsWindow', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockExecaImpl.mockImplementation(async (bin: string, args: string[] = []) => {
      return { stdout: '' };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('captures a window via osascript when iTerm is the app', async () => {
    mockExecaImpl.mockImplementation(async (bin: string, args: string[] = []) => {
      if (bin === 'osascript') {
        return { stdout: '12345\n' };
      } else if (bin === 'screencapture' || bin === 'open') {
        return { stdout: '' };
      }
      throw new Error(`Unexpected: ${bin}`);
    });

    await expect(captureMacOsWindow('iTerm', '/tmp/output.png')).resolves.toBeUndefined();

    expect(mockExecaImpl).toHaveBeenCalledWith('osascript', expect.any(Array));
    expect(mockExecaImpl).toHaveBeenCalledWith(
      'screencapture',
      expect.arrayContaining(['-l', '12345', '/tmp/output.png'])
    );
  });

  it('throws timeout error when osascript continuously fails', async () => {
    mockExecaImpl.mockImplementation(async (bin: string, args: string[] = []) => {
      if (bin === 'osascript') {
        throw new Error('execution error');
      }
      throw new Error(`Unexpected: ${bin}`);
    });

    await expect(captureMacOsWindow('iTerm', '/tmp/output.png', 50, 10)).rejects.toThrow(/Timeout waiting for window/);
  });

  it('throws when screencapture fails after retries', async () => {
    mockExecaImpl.mockImplementation(async (bin: string, args: string[] = []) => {
      if (bin === 'osascript') {
        return { stdout: '12345\n' };
      } else if (bin === 'screencapture') {
        throw new Error('screencapture failed');
      } else if (bin === 'open') {
        return { stdout: '' };
      }
      throw new Error(`Unexpected: ${bin}`);
    });

    await expect(captureMacOsWindow('iTerm', '/tmp/output.png', 50, 10)).rejects.toThrow(/Failed to capture window/);
  });

  it('times out when the window never appears', async () => {
    mockExecaImpl.mockImplementation(async (bin: string, args: string[] = []) => {
      if (bin === 'osascript') {
        throw new Error('window not found');
      }
      throw new Error(`Unexpected: ${bin}`);
    });

    await expect(captureMacOsWindow('iTerm', '/tmp/output.png', 50, 10)).rejects.toThrow(/Timeout waiting for window/);
  });

  it.each(['Alacritty', 'WezTerm', 'Ghostty'])(
    'captures a window via CGWindowList (Swift) for %s',
    async (appName) => {
      mockExecaImpl.mockImplementation(async (bin: string, args: string[] = []) => {
        if (bin === 'swift') {
          return { stdout: '99999\n' };
        } else if (bin === 'open' || bin === 'screencapture') {
          return { stdout: '' };
        }
        throw new Error(`Unexpected execa call: ${bin}`);
      });

      await expect(captureMacOsWindow(appName, '/tmp/output.png', 5000, 10)).resolves.toBeUndefined();

      const osascriptCalls = mockExecaImpl.mock.calls.filter((c) => c[0] === 'osascript');
      expect(osascriptCalls).toHaveLength(0);

      expect(mockExecaImpl).toHaveBeenCalledWith(
        'screencapture',
        expect.arrayContaining(['-l', '99999', '/tmp/output.png'])
      );
    },
    10_000,
  );

  it.each(['Alacritty', 'WezTerm', 'Ghostty'])('times out waiting for CGWindowList window for %s', async (appName) => {
    mockExecaImpl.mockImplementation(async (bin: string, args: string[] = []) => {
      if (bin === 'swift') {
        return { stdout: '' };
      }
      return { stdout: '' };
    });

    await expect(captureMacOsWindow(appName, '/tmp/output.png', 50, 10)).rejects.toThrow(/Timeout waiting for window/);
  });
});

describe('MacOsSnapshotStrategy', () => {
  it('delegates capture() to captureMacOsWindow with the configured app name', async () => {
    mockExecaImpl.mockImplementation(async (bin: string, args: string[] = []) => {
      if (bin === 'osascript') {
        return { stdout: '42\n' };
      } else if (bin === 'screencapture' || bin === 'open') {
        return { stdout: '' };
      }
      throw new Error(`Unexpected: ${bin}`);
    });

    const snapshotter = new MacOsSnapshotStrategy('iTerm');
    await expect(snapshotter.capture('/tmp/snap.png', 80, 24, 'tuikit_abc')).resolves.toBeUndefined();

    expect(mockExecaImpl).toHaveBeenCalledWith(
      'screencapture',
      expect.arrayContaining(['-l', '42', '/tmp/snap.png'])
    );
  });
});
