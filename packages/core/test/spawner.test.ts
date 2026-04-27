import { describe, it, expect, vi } from 'vitest';
import { getTerminalTestSuite } from './helpers/canRunTerminal.js';
import { hasBinary } from './helpers/hasBinary.js';
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
      async function runSpawnTest(expectedVirtualSessionType: 'xvfb' | 'sway' | 'kwin' | null) {
        const originalEnv = { ...process.env };
        if (expectedVirtualSessionType === null) {
          process.env.TUIKIT_HEADLESS = '0';
        } else {
          process.env.TUIKIT_HEADLESS = '1';
        }

        let hasCommandSpy: ReturnType<typeof vi.spyOn> | undefined;
        if (expectedVirtualSessionType) {
          const { VirtualSessionManager } = await import('../src/spawn/linux/VirtualSessionManager.js');

          hasCommandSpy = vi
            .spyOn(VirtualSessionManager as any, 'hasCommand')
            .mockImplementation(async (cmd: string) => {
              if (expectedVirtualSessionType === 'xvfb' && cmd === 'Xvfb') return true;
              if (expectedVirtualSessionType === 'sway' && cmd === 'sway') return true;
              if (expectedVirtualSessionType === 'kwin' && cmd === 'kwin_wayland') return true;
              return false;
            });
        }

        try {
          const spawner = SpawnerFactory.create(config.strategy);
          const result = await spawner.spawn(config.options);

          expect(result).toBeDefined();

          if (config.strategy === 'native') {
            expect(result.pid).toBeDefined();

            expect(result.pid).not.toBeNull();
          }

          let shouldHaveWindowId = true;
          const isLinuxHeadless = process.platform === 'linux' && process.env.TUIKIT_HEADLESS !== '0';
          if (isLinuxHeadless) {
            shouldHaveWindowId = false;
          } else if (process.platform === 'linux') {
            const { isX11DisplayServer } = await import('../src/utils/linuxDisplay.js');
            const isX11 = await isX11DisplayServer();
            if (!isX11) {
              shouldHaveWindowId = false;
            }
          }

          if (shouldHaveWindowId) {
            expect(result.windowId).toBeDefined();

            expect(result.windowId).not.toBeNull();
          }

          if (result.pid) {
            await spawner.kill(result.pid);
          }
        } finally {
          process.env = originalEnv;
          if (hasCommandSpy) {
            hasCommandSpy.mockRestore();
          }
        }
      }

      it(`should spawn natively (or display server default)`, async () => {
        await runSpawnTest(null);
      });

      if (process.platform === 'linux') {
        const xvfbAvail = hasBinary('Xvfb');
        it.runIf(xvfbAvail)(`should spawn in Xvfb headless${xvfbAvail ? '' : ' [UNAVAILABLE: Xvfb missing]'}`, async () => {
          await runSpawnTest('xvfb');
        });

        const swayAvail = hasBinary('sway');
        it.runIf(swayAvail)(`should spawn in sway headless${swayAvail ? '' : ' [UNAVAILABLE: sway missing]'}`, async () => {
          await runSpawnTest('sway');
        });

        const kwinAvail = hasBinary('kwin_wayland');
        it.runIf(kwinAvail)(`should spawn in kwin headless${kwinAvail ? '' : ' [UNAVAILABLE: kwin missing]'}`, async () => {
          await runSpawnTest('kwin');
        });
      }
    });
  }
});
