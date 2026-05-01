import { isX11DisplayServer } from '@dragoscirjan/mcp-tuikit-linux-utils';
import { execa } from 'execa';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LinuxSnapshotStrategy } from './linux.js';

vi.mock('@dragoscirjan/mcp-tuikit-linux-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dragoscirjan/mcp-tuikit-linux-utils')>();
  return {
    ...actual,
    isX11DisplayServer: vi.fn(),
  };
});

vi.mock('execa', () => ({
  execa: vi.fn(async (cmd) => {
    if (cmd === 'import' || cmd === 'grim') {
      return { stdout: '' };
    }
    throw new Error('Command not found');
  }),
}));

vi.mock('dbus-next', () => {
  return {
    default: {
      sessionBus: vi.fn(() => {
        throw new Error('DBus not available in tests');
      }),
    },
  };
});

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn(() => true),
    statSync: vi.fn(() => ({ size: 100 })),
  };
});

describe('LinuxSnapshotStrategy', () => {
  let strategy: LinuxSnapshotStrategy;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should try to capture using X11 tools when in X11 env', async () => {
    process.env.XDG_CURRENT_DESKTOP = 'UNKNOWN';
    vi.mocked(isX11DisplayServer).mockResolvedValue(true);

    strategy = new LinuxSnapshotStrategy();
    await strategy.capture('output.png', 80, 24, 'session', {
      windowId: '1234',
      fallbackIdentifier: 'Alacritty',
    });

    expect(execa).toHaveBeenCalledWith('import', ['-window', '1234', 'output.png']);
  });

  it('should capture using Wayland grim when in Wayland env', async () => {
    process.env.XDG_CURRENT_DESKTOP = 'UNKNOWN';
    vi.mocked(isX11DisplayServer).mockResolvedValue(false);

    strategy = new LinuxSnapshotStrategy();
    await strategy.capture('output.png', 80, 24, 'session', {
      windowId: '1234',
      fallbackIdentifier: 'Alacritty',
    });

    expect(execa).toHaveBeenCalledWith('grim', ['output.png']);
  });
});
