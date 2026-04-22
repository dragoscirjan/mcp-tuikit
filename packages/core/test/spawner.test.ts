import { describe, it, expect } from 'vitest';
import { getTerminalTestSuite } from './helpers/canRunTerminal.js';
import { SpawnOptions } from '../src/spawn/AppSpawner.js';
import { SpawnerFactory } from '../src/spawn/SpawnerFactory.js';
import { Terminal } from '../src/Terminal.js';

interface SpawnerTestConfig {
  terminal: Terminal;
  strategy: 'native' | 'open';
  options: SpawnOptions;
}

const configs: SpawnerTestConfig[] = [
  {
    terminal: 'powershell',
    strategy: 'native',
    options: {
      appName: 'PowerShell',
      executable: 'powershell.exe',
      args: ['-Command', 'Start-Sleep -Seconds 2'],
      requireWindowId: true,
    },
  },
  {
    terminal: 'pwsh',
    strategy: 'native',
    options: {
      appName: 'pwsh',
      executable: 'pwsh.exe',
      args: ['-Command', 'Start-Sleep -Seconds 2'],
      requireWindowId: true,
    },
  },
  {
    terminal: 'cmd',
    strategy: 'native',
    options: {
      appName: 'cmd',
      executable: 'cmd.exe',
      args: ['/c', 'timeout /t 2 >nul'],
      requireWindowId: true,
    },
  },
  {
    terminal: 'windows-terminal',
    strategy: 'native',
    options: {
      appName: 'WindowsTerminal',
      executable: 'wt.exe',
      args: ['-w', 'new', 'powershell.exe', '-Command', 'Start-Sleep -Seconds 2'],
      requireWindowId: true,
    },
  },
  {
    terminal: 'alacritty',
    strategy: process.platform === 'darwin' ? 'open' : 'native',
    options: {
      appName: 'Alacritty',
      executable: process.platform === 'darwin' ? 'Alacritty' : 'alacritty',
      args:
        process.platform === 'darwin'
          ? []
          : [
              '-e',
              process.platform === 'win32' ? 'powershell.exe' : 'sleep',
              process.platform === 'win32' ? 'Start-Sleep -Seconds 2' : '2',
            ],
      requireWindowId: true,
    },
  },
  {
    terminal: 'wezterm',
    strategy: 'native',
    options: {
      appName: 'WezTerm',
      executable: 'wezterm',
      args: [
        'start',
        '--',
        process.platform === 'win32' ? 'powershell.exe' : 'sleep',
        process.platform === 'win32' ? 'Start-Sleep -Seconds 2' : '2',
      ],
      requireWindowId: true,
    },
  },
  {
    terminal: 'ghostty',
    strategy: process.platform === 'darwin' ? 'open' : 'native',
    options: {
      appName: 'Ghostty',
      executable: process.platform === 'darwin' ? 'Ghostty' : 'ghostty',
      args: process.platform === 'darwin' ? [] : ['-e', 'sleep 2'],
      requireWindowId: true,
    },
  },
  {
    terminal: 'kitty',
    strategy: 'native',
    options: {
      appName: 'kitty',
      executable: 'kitty',
      args: ['--', 'sleep', '2'],
      requireWindowId: true,
    },
  },
  {
    terminal: 'konsole',
    strategy: 'native',
    options: {
      appName: 'konsole',
      executable: 'konsole',
      args: ['-e', 'sleep', '2'],
      requireWindowId: true,
    },
  },
  {
    terminal: 'gnome-terminal',
    strategy: 'native',
    options: {
      appName: 'gnome-terminal',
      executable: 'gnome-terminal',
      args: ['--', 'sleep', '2'],
      requireWindowId: true,
    },
  },
];

describe('Spawner Integration Tests', () => {
  for (const config of configs) {
    const suite = getTerminalTestSuite(config.terminal, config.terminal);

    suite.d(suite.label, () => {
      it(`should capture window ID for ${config.terminal}`, async () => {
        const spawner = SpawnerFactory.create(config.strategy);
        const result = await spawner.spawn(config.options);

        expect(result).toBeDefined();

        if (config.strategy === 'native') {
          // eslint-disable-next-line vitest/no-conditional-expect
          expect(result.pid).toBeDefined();
          // eslint-disable-next-line vitest/no-conditional-expect
          expect(result.pid).not.toBeNull();
        }

        expect(result.windowId).toBeDefined();
        expect(result.windowId).not.toBeNull();

        if (result.pid) {
          await spawner.kill(result.pid);
        }
      });
    });
  }
});
