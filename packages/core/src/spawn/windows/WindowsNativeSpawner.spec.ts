import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WindowsNativeSpawner } from './WindowsNativeSpawner.js';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(() => ({
    unref: vi.fn(),
    on: vi.fn(),
    pid: 1234,
  })),
}));

vi.mock('execa', () => ({
  execa: vi.fn(async (cmd, args) => {
    if (cmd === 'powershell.exe') {
      const commandStr = args[3];
      if (commandStr.includes('$processName = "WindowsTerminal"')) {
        return { stdout: '4321\n' };
      }
      if (commandStr.includes('$pidTarget = 1234')) {
        return { stdout: '9876\n' };
      }
    }
    throw new Error('Command not found');
  }),
}));

const d = process.platform !== 'win32' ? describe.skip : describe;

d('WindowsNativeSpawner', () => {
  let spawner: WindowsNativeSpawner;

  beforeEach(() => {
    spawner = new WindowsNativeSpawner();
    vi.clearAllMocks();
  });

  it('should spawn process and return pid with windowId for standard app', async () => {
    const result = await spawner.spawn({
      executable: 'someapp.exe',
      args: [],
      appName: 'SomeApp',
      requireWindowId: true,
    });

    expect(result.pid).toBe(1234);
    expect(result.windowId).toBe('9876');
    expect((result as Record<string, unknown>).fallbackIdentifier).toBe('SomeApp');
  });

  it('should spawn process and return windowId by process name for Windows Terminal', async () => {
    const result = await spawner.spawn({
      executable: 'wt.exe',
      args: [],
      appName: 'Windows Terminal',
      requireWindowId: true,
    });

    expect(result.pid).toBe(1234);
    expect(result.windowId).toBe('4321');
    expect((result as Record<string, unknown>).fallbackIdentifier).toBe('Windows Terminal');
  });

  it('should gracefully handle kill', async () => {
    const killMock = vi.spyOn(process, 'kill').mockImplementation(() => true);
    await spawner.kill(1234);
    expect(killMock).toHaveBeenCalledWith(1234, 'SIGTERM');
  });
});
