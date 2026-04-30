import { describe, it, expect, vi, beforeEach } from 'vitest';
const describeLinux = process.platform === 'linux' ? describe : describe.skip;
import { LinuxNativeSpawner } from './LinuxNativeSpawner.js';

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    spawn: vi.fn(() => ({
      unref: vi.fn(),
      pid: 1234,
    })),
  };
});

vi.mock('execa', () => ({
  execa: vi.fn(async (cmd) => {
    if (cmd === 'xdotool') {
      return { stdout: '4321\n' };
    }
    throw new Error('Command not found');
  }),
}));

vi.mock('./VirtualSessionManager.js', () => ({
  VirtualSessionManager: {
    createSession: vi.fn().mockResolvedValue({
      type: 'xvfb',
      display: ':99',
      envOverrides: { DISPLAY: ':99' },
      kill: vi.fn(),
    }),
  },
}));

describeLinux('LinuxNativeSpawner', () => {
  let spawner: LinuxNativeSpawner;

  beforeEach(() => {
    spawner = new LinuxNativeSpawner();
    vi.clearAllMocks();
  });

  it('should spawn process and return pid with windowId', async () => {
    process.env.DISPLAY = ':0';
    delete process.env.WAYLAND_DISPLAY;
    delete process.env.XDG_SESSION_TYPE;

    // TUIKIT_HEADLESS is by default '1' on linux, but it branches on '0'.
    // We should test it in non-headless mode to avoid xvfb branch,
    // or test xvfb branch specifically. Let's test non-headless to trigger getX11WindowId.
    process.env.TUIKIT_HEADLESS = '0';

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
