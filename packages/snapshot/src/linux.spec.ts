import path from 'node:path';
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

// Since node:fs is imported as * as fs in linux.ts, vi.mock should use that format
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn().mockImplementation(() => true),
    statSync: vi.fn().mockImplementation(() => ({ size: 100 })),
  };
});

describe('LinuxSnapshotStrategy', () => {
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
    vi.mocked(isX11DisplayServer).mockResolvedValue(true);
    // Return empty for desktop env so it falls back to generic X11
    vi.stubEnv('XDG_CURRENT_DESKTOP', '');

    const strategy = new LinuxSnapshotStrategy();
    await strategy.capture('output.png', 80, 24, 'session-id', { windowId: '1234' });

    const absoluteOutputPath = path.resolve(process.cwd(), 'output.png');
    expect(execa).toHaveBeenCalledWith('import', ['-window', '1234', absoluteOutputPath]);
  });

  it('should capture using Wayland grim when in Wayland env', async () => {
    vi.mocked(isX11DisplayServer).mockResolvedValue(false);
    // Generic wayland fallback
    vi.stubEnv('XDG_CURRENT_DESKTOP', '');

    const strategy = new LinuxSnapshotStrategy();
    await strategy.capture('output.png', 80, 24, 'session-id', {});

    const absoluteOutputPath = path.resolve(process.cwd(), 'output.png');
    expect(execa).toHaveBeenCalledWith('grim', [absoluteOutputPath]);
  });
});
