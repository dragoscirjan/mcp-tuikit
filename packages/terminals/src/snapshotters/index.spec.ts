import { describe, it, expect, afterEach } from 'vitest';
import { resolveSnapshotStrategy, PlaywrightSnapshotStrategy, MacOsSnapshotStrategy } from './index.js';

describe('resolveSnapshotStrategy', () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    });
  });

  const setPlatform = (platform: string) => {
    Object.defineProperty(process, 'platform', {
      value: platform,
    });
  };

  it('returns PlaywrightSnapshotStrategy when backendConfig is "xterm.js"', () => {
    setPlatform('darwin');
    const snapshotStrategy = resolveSnapshotStrategy('xterm.js');
    expect(snapshotStrategy).toBeInstanceOf(PlaywrightSnapshotStrategy);
  });

  it('returns MacOsSnapshotStrategy on darwin with a non-playwright backend', () => {
    setPlatform('darwin');
    const snapshotStrategy = resolveSnapshotStrategy('iterm2');
    expect(snapshotStrategy).toBeInstanceOf(MacOsSnapshotStrategy);
  });

  it('falls back to PlaywrightSnapshotStrategy on unknown platform', () => {
    setPlatform('freebsd');
    const snapshotStrategy = resolveSnapshotStrategy('xterm');
    expect(snapshotStrategy).toBeInstanceOf(PlaywrightSnapshotStrategy);
  });
});
