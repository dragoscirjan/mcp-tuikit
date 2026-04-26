import { SnapshotStrategy } from '@mcp-tuikit/core';
import { Terminal } from '@mcp-tuikit/core';
import { LinuxSnapshotStrategy } from './linux.js';
import { MacOsSnapshotStrategy } from './macos.js';
import { PlaywrightSnapshotStrategy } from './playwright.js';
import { WindowsSnapshotStrategy } from './windows.js';

export { MacOsSnapshotStrategy } from './macos.js';
export { PlaywrightSnapshotStrategy } from './playwright.js';
export { LinuxSnapshotStrategy } from './linux.js';
export { WindowsSnapshotStrategy } from './windows.js';

export function resolveSnapshotStrategy(backendConfig: Terminal): SnapshotStrategy {
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
