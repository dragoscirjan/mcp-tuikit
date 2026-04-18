import { execa } from 'execa';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinuxSnapshotStrategy } from './linux.js';

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

  beforeEach(() => {
    strategy = new LinuxSnapshotStrategy();
    vi.clearAllMocks();
  });

  it('should try to capture using X11 tools when in X11 env', async () => {
    process.env.DISPLAY = ':0';
    delete process.env.WAYLAND_DISPLAY;

    await strategy.capture('output.png', 80, 24, 'session', {
      windowId: '1234',
      fallbackIdentifier: 'Alacritty',
    });

    expect(execa).toHaveBeenCalledWith('import', ['-window', '1234', 'output.png']);
  });

  it('should capture using Wayland grim when in Wayland env', async () => {
    process.env.WAYLAND_DISPLAY = 'wayland-0';
    delete process.env.DISPLAY;

    await strategy.capture('output.png', 80, 24, 'session', {
      windowId: '1234',
      fallbackIdentifier: 'Alacritty',
    });

    expect(execa).toHaveBeenCalledWith('grim', ['output.png']);
  });
});
