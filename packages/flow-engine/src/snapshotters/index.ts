import { Snapshotter } from '@mcp-tuikit/core';
import { LinuxSnapshotter } from './linux.js';
import { MacOsSnapshotter } from './macos.js';
import { PlaywrightSnapshotter } from './playwright.js';
import { WindowsSnapshotter } from './windows.js';

export { LinuxSnapshotter } from './linux.js';
export { MacOsSnapshotter } from './macos.js';
export { PlaywrightSnapshotter } from './playwright.js';
export { WindowsSnapshotter } from './windows.js';

/**
 * Resolve the correct Snapshotter for the current environment.
 *
 * Selection order:
 * 1. `backendConfig === 'xterm.js'`   → PlaywrightSnapshotter (works everywhere)
 * 2. `process.platform === 'darwin'`  → MacOsSnapshotter
 * 3. `process.platform === 'linux'`   → LinuxSnapshotter (stub — throws with guidance)
 * 4. `process.platform === 'win32'`   → WindowsSnapshotter (stub — throws with guidance)
 * 5. Fallback                         → PlaywrightSnapshotter (safest universal default)
 *
 * This is the **only** place in the codebase where platform or backend branching
 * for PNG capture may occur.  All call sites must use this factory.
 */
export function resolveSnapshotter(backendConfig: string): Snapshotter {
  if (backendConfig === 'xterm.js') {
    return new PlaywrightSnapshotter();
  }

  switch (process.platform) {
    case 'darwin':
      return new MacOsSnapshotter(backendConfig);
    case 'linux':
      return new LinuxSnapshotter();
    case 'win32':
      return new WindowsSnapshotter();
    default:
      // Unknown platform — Playwright is the safest universal fallback
      return new PlaywrightSnapshotter();
  }
}
