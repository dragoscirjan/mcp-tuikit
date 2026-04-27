import { execSync } from 'node:child_process';
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

const isLinux = process.platform === 'linux';

function getTestConfig(bin: string) {
  if (!isLinux) return { it: it.skip, label: ' [SKIPPED: wrong OS]' };
  const available = hasBinary(bin);
  if (!available) return { it: it.skip, label: ' [UNAVAILABLE: binary missing]' };
  return { it, label: '' };
}

const xvfbConfig = getTestConfig('Xvfb');
const swayConfig = getTestConfig('sway');
const kwinConfig = getTestConfig('kwin_wayland');

describe('VirtualSessionManager Integration Tests', () => {
  let session: VirtualSession | null = null;

  afterEach(async () => {
    if (session) {
      await session.kill();
      session = null;
    }
  });

  xvfbConfig.it(`should spawn an Xvfb session and assign a random display${xvfbConfig.label}`, async () => {
    session = await VirtualSessionManager.createSession();

    expect(session).toBeDefined();
    expect(session!.type).toBe('xvfb');
    expect(session!.pid).toBeGreaterThan(0);

    const displayNum = session!.envOverrides.DISPLAY;
    expect(displayNum).toMatch(/^:\d+$/);

    expect(() => process.kill(session!.pid, 0)).not.toThrow();
  });

  swayConfig.it(`should fallback to sway session if Xvfb is not found${swayConfig.label}`, async () => {
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

  kwinConfig.it(`should fallback to kwin session if Xvfb and sway are not found${kwinConfig.label}`, async () => {
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
  });
});
