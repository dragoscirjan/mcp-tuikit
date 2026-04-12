/**
 * Unit tests for packages/flow-engine/src/snapshotters/index.ts
 *
 * Verifies that resolveSnapshotter returns the correct implementation
 * based on backendConfig and process.platform.
 */
import { describe, it, expect, afterEach } from 'vitest';

// Store original platform so we can restore it
const originalPlatform = process.platform;

function setPlatform(p: string) {
  Object.defineProperty(process, 'platform', { value: p, configurable: true });
}

afterEach(() => {
  Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
});

// Import lazily so platform overrides take effect before module cache warms up.
// resolveSnapshotter reads process.platform at call time — no lazy import needed.
import {
  resolveSnapshotter,
  PlaywrightSnapshotter,
  MacOsSnapshotter,
  LinuxSnapshotter,
  WindowsSnapshotter,
} from './index.js';

describe('resolveSnapshotter', () => {
  it('returns PlaywrightSnapshotter when backendConfig is "xterm.js"', () => {
    const snapshotter = resolveSnapshotter('xterm.js');
    expect(snapshotter).toBeInstanceOf(PlaywrightSnapshotter);
  });

  it('returns PlaywrightSnapshotter for "xterm.js" regardless of platform', () => {
    setPlatform('darwin');
    expect(resolveSnapshotter('xterm.js')).toBeInstanceOf(PlaywrightSnapshotter);
    setPlatform('linux');
    expect(resolveSnapshotter('xterm.js')).toBeInstanceOf(PlaywrightSnapshotter);
    setPlatform('win32');
    expect(resolveSnapshotter('xterm.js')).toBeInstanceOf(PlaywrightSnapshotter);
  });

  it('returns MacOsSnapshotter on darwin with a non-playwright backend', () => {
    setPlatform('darwin');
    const snapshotter = resolveSnapshotter('iterm2');
    expect(snapshotter).toBeInstanceOf(MacOsSnapshotter);
  });

  it('returns LinuxSnapshotter on linux with a non-playwright backend', () => {
    setPlatform('linux');
    const snapshotter = resolveSnapshotter('gnome-terminal');
    expect(snapshotter).toBeInstanceOf(LinuxSnapshotter);
  });

  it('returns WindowsSnapshotter on win32 with a non-playwright backend', () => {
    setPlatform('win32');
    const snapshotter = resolveSnapshotter('windows-terminal');
    expect(snapshotter).toBeInstanceOf(WindowsSnapshotter);
  });

  it('falls back to PlaywrightSnapshotter on unknown platform', () => {
    setPlatform('freebsd');
    const snapshotter = resolveSnapshotter('xterm');
    expect(snapshotter).toBeInstanceOf(PlaywrightSnapshotter);
  });
});

describe('LinuxSnapshotter', () => {
  it('throws a helpful error with guidance to use xterm.js', async () => {
    const s = new LinuxSnapshotter();
    await expect(s.capture('/tmp/out.png', 80, 24, 'session')).rejects.toThrow(/TUIKIT_TERMINAL=xterm\.js/);
  });
});

describe('WindowsSnapshotter', () => {
  it('throws a helpful error with guidance to use xterm.js', async () => {
    const s = new WindowsSnapshotter();
    await expect(s.capture('/tmp/out.png', 80, 24, 'session')).rejects.toThrow(/TUIKIT_TERMINAL=xterm\.js/);
  });
});
