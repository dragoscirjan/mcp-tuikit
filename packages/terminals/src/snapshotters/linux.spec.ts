import { isX11DisplayServer } from '@mcp-tuikit/core';
import { execa } from 'execa';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HeadlessSnapshotStrategy } from './headless.js';
import { LinuxSnapshotStrategy } from './linux.js';

vi.mock('./headless.js', () => {
  return {
    HeadlessSnapshotStrategy: vi.fn(),
  };
});

vi.mock('@mcp-tuikit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mcp-tuikit/core')>();
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

  it('should use headless strategy by default (LINUX_SNAPSHOT_MODE unset)', async () => {
    delete process.env.LINUX_SNAPSHOT_MODE;
    const captureSpy = vi.fn().mockResolvedValue(undefined);
    vi.mocked(HeadlessSnapshotStrategy).mockImplementation(function () {
      return { capture: captureSpy } as never;
    } as never);

    strategy = new LinuxSnapshotStrategy();

    await strategy.capture('output.png', 80, 24, 'session', {
      windowId: '1234',
      fallbackIdentifier: 'Alacritty',
    });

    expect(captureSpy).toHaveBeenCalledWith('output.png', 80, 24, 'session', {
      windowId: '1234',
      fallbackIdentifier: 'Alacritty',
    });
    expect(execa).not.toHaveBeenCalledWith('import', expect.anything());
    expect(execa).not.toHaveBeenCalledWith('grim', expect.anything());
  });

  it('should use headless strategy if LINUX_SNAPSHOT_MODE is headless', async () => {
    process.env.LINUX_SNAPSHOT_MODE = 'headless';
    const captureSpy = vi.fn().mockResolvedValue(undefined);
    vi.mocked(HeadlessSnapshotStrategy).mockImplementation(function () {
      return { capture: captureSpy } as never;
    } as never);

    strategy = new LinuxSnapshotStrategy();

    await strategy.capture('output.png', 80, 24, 'session', {
      windowId: '1234',
    });

    expect(captureSpy).toHaveBeenCalled();
  });

  it('should try to capture using X11 tools when in X11 env and mode is native', async () => {
    process.env.LINUX_SNAPSHOT_MODE = 'native';
    process.env.XDG_CURRENT_DESKTOP = 'UNKNOWN';
    vi.mocked(isX11DisplayServer).mockResolvedValue(true);

    vi.mocked(HeadlessSnapshotStrategy).mockImplementation(function () {
      return { capture: vi.fn() } as never;
    } as never);

    strategy = new LinuxSnapshotStrategy();
    await strategy.capture('output.png', 80, 24, 'session', {
      windowId: '1234',
      fallbackIdentifier: 'Alacritty',
    });

    expect(execa).toHaveBeenCalledWith('import', ['-window', '1234', 'output.png']);
  });

  it('should capture using Wayland grim when in Wayland env and mode is native', async () => {
    process.env.LINUX_SNAPSHOT_MODE = 'native';
    process.env.XDG_CURRENT_DESKTOP = 'UNKNOWN';
    vi.mocked(isX11DisplayServer).mockResolvedValue(false);

    vi.mocked(HeadlessSnapshotStrategy).mockImplementation(function () {
      return { capture: vi.fn() } as never;
    } as never);

    strategy = new LinuxSnapshotStrategy();
    await strategy.capture('output.png', 80, 24, 'session', {
      windowId: '1234',
      fallbackIdentifier: 'Alacritty',
    });

    expect(execa).toHaveBeenCalledWith('grim', ['output.png']);
  });
});
