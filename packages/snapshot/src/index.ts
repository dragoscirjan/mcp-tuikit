import { LinuxSnapshotStrategy } from './linux.js';
import { MacOsSnapshotStrategy } from './macos.js';
import { PlaywrightSnapshotStrategy } from './playwright.js';
import { SnapshotStrategy } from './SnapshotStrategy.js';
import { WindowsSnapshotStrategy } from './windows.js';

export { MacOsSnapshotStrategy } from './macos.js';
export { PlaywrightSnapshotStrategy } from './playwright.js';
export { LinuxSnapshotStrategy } from './linux.js';
export { WindowsSnapshotStrategy } from './windows.js';
export { SnapshotStrategy } from './SnapshotStrategy.js';
export { loadXtermAssets, getPlaywrightLaunchOptions, capturePlaywrightSnapshot } from './playwright-utils.js';

export function resolveSnapshotStrategy(backendConfig: string): SnapshotStrategy {
  if (backendConfig === 'xterm.js') {
    return new PlaywrightSnapshotStrategy();
  }

  switch (process.platform) {
    case 'darwin':
      return new MacOsSnapshotStrategy(backendConfig);
    case 'linux':
      return new LinuxSnapshotStrategy();
    case 'win32':
      return new WindowsSnapshotStrategy(backendConfig);
    default:
      return new PlaywrightSnapshotStrategy();
  }
}
