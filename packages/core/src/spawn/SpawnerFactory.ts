import { AppSpawner } from './AppSpawner.js';
import { LinuxNativeSpawner } from './linux/LinuxNativeSpawner.js';
import { MacOsNativeSpawner } from './macos/MacOsNativeSpawner.js';
import { MacOsOpenSpawner } from './macos/MacOsOpenSpawner.js';

export class SpawnerFactory {
  static create(strategy: 'native' | 'open'): AppSpawner {
    const platform = process.platform;

    if (platform === 'darwin') {
      return strategy === 'native' ? new MacOsNativeSpawner() : new MacOsOpenSpawner();
    }

    if (platform === 'linux') {
      return new LinuxNativeSpawner();
    }

    if (platform === 'win32') {
      // Stub for future Windows support
      throw new Error('Windows spawners not yet implemented');
    }

    throw new Error(`Unsupported platform for spawner: ${platform}`);
  }
}
