import { execSync } from 'node:child_process';
import { isLinux } from '@mcp-tuikit/test';
import { describe, it, expect, afterEach } from 'vitest';
import { VirtualSessionManager, VirtualSession } from '../src/spawn/linux/VirtualSessionManager.js';

function hasBinary(bin: string): boolean {
  try {
    execSync(`which ${bin}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function getTestLabel(bin: string) {
  if (!isLinux) return ' [SKIPPED: wrong OS]';
  return hasBinary(bin) ? '' : ' [UNAVAILABLE: binary missing]';
}

const xvfbAvail = isLinux && hasBinary('Xvfb');
const swayAvail = isLinux && hasBinary('sway');
const kwinAvail = isLinux && hasBinary('kwin_wayland');

describe('VirtualSessionManager Integration Tests', () => {
  let session: VirtualSession | null = null;

  afterEach(async () => {
    if (session) {
      await session.kill();
      session = null;
    }
  });

  it.runIf(xvfbAvail)(`should spawn an Xvfb session and assign a random display${getTestLabel('Xvfb')}`, async () => {
    session = await VirtualSessionManager.createSession();

    expect(session).toBeDefined();
    expect(session!.type).toBe('xvfb');
    expect(session!.pid).toBeGreaterThan(0);

    const displayNum = session!.envOverrides.DISPLAY;
    expect(displayNum).toMatch(/^:\d+$/);

    expect(() => process.kill(session!.pid, 0)).not.toThrow();
  });

  it.runIf(swayAvail)(`should fallback to sway session if Xvfb is not found${getTestLabel('sway')}`, async () => {
    // Mock hasCommand so VirtualSessionManager thinks Xvfb is missing and sway is present
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalHasCommand = (VirtualSessionManager as any).hasCommand;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (VirtualSessionManager as any).hasCommand = async (cmd: string) => cmd === 'sway';

    try {
      session = await VirtualSessionManager.createSession();

      expect(session).toBeDefined();
      expect(session!.type).toBe('sway');
      expect(session!.pid).toBeGreaterThan(0);

      const waylandDisplay = session!.envOverrides.WAYLAND_DISPLAY;
      expect(waylandDisplay).toBeDefined();
      expect(waylandDisplay).toContain('wayland-');

      expect(() => process.kill(session!.pid, 0)).not.toThrow();
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (VirtualSessionManager as any).hasCommand = originalHasCommand;
    }
  });

  it.runIf(kwinAvail)(
    `should fallback to kwin session if Xvfb and sway are not found${getTestLabel('kwin_wayland')}`,
    async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalHasCommand = (VirtualSessionManager as any).hasCommand;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (VirtualSessionManager as any).hasCommand = async (cmd: string) => cmd === 'kwin_wayland';

      try {
        session = await VirtualSessionManager.createSession();

        expect(session).toBeDefined();
        expect(session!.type).toBe('kwin');
        expect(session!.pid).toBeGreaterThan(0);

        const waylandDisplay = session!.envOverrides.WAYLAND_DISPLAY;
        expect(waylandDisplay).toBeDefined();
        expect(waylandDisplay).toContain('wayland-');

        expect(() => process.kill(session!.pid, 0)).not.toThrow();
      } finally {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (VirtualSessionManager as any).hasCommand = originalHasCommand;
      }
    },
  );
});
