import { execa } from 'execa';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WindowsSnapshotStrategy } from './windows.js';

vi.mock('execa', () => ({
  execa: vi.fn(async () => {
    return { stdout: '' };
  }),
}));

describe('WindowsSnapshotStrategy', () => {
  let strategy: WindowsSnapshotStrategy;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should pass windowId if available', async () => {
    strategy = new WindowsSnapshotStrategy('wezterm');
    await strategy.capture('output.png', 80, 24, 'session', {
      windowHandle: '1234',
    });

    expect(execa).toHaveBeenCalled();
    const args = vi.mocked(execa).mock.calls[0][1];
    expect(args).toContain('-TargetWindowId');
    expect(args).toContain('1234');
  });

  it('should pass target process name if windowId is missing', async () => {
    strategy = new WindowsSnapshotStrategy('windows-terminal');
    await strategy.capture('output.png', 80, 24, 'session', {});

    expect(execa).toHaveBeenCalled();
    const args = vi.mocked(execa).mock.calls[0][1];
    expect(args).toContain('-TargetProcessName');
    expect(args).toContain('WindowsTerminal');
  });
});
