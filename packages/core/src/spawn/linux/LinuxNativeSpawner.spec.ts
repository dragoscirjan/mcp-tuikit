import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinuxNativeSpawner } from './LinuxNativeSpawner.js';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(() => ({
    unref: vi.fn(),
    pid: 1234,
  })),
}));

vi.mock('execa', () => ({
  execa: vi.fn(async (cmd) => {
    if (cmd === 'xdotool') {
      return { stdout: '4321\n' };
    }
    throw new Error('Command not found');
  }),
}));

const d = process.platform != 'linux' ? describe.skip : describe;

d('LinuxNativeSpawner', () => {
  let spawner: LinuxNativeSpawner;

  beforeEach(() => {
    spawner = new LinuxNativeSpawner();
    vi.clearAllMocks();
  });

  it('should spawn process and return pid with windowId', async () => {
    process.env.DISPLAY = ':0';
    delete process.env.WAYLAND_DISPLAY;
    delete process.env.XDG_SESSION_TYPE;

    const result = await spawner.spawn({
      executable: 'alacritty',
      args: [],
      appName: 'Alacritty',
      requireWindowId: true,
    });

    expect(result.pid).toBe(1234);
    expect(result.windowId).toBe('4321');
    expect((result as Record<string, unknown>).fallbackIdentifier).toBe('Alacritty');
  });

  it('should gracefully handle kill', async () => {
    const killMock = vi.spyOn(process, 'kill').mockImplementation(() => true);
    await spawner.kill(1234);
    expect(killMock).toHaveBeenCalledWith(1234, 'SIGTERM');
  });
});
