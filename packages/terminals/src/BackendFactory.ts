import { TerminalBackend, SpawnerFactory, Terminal } from '@mcp-tuikit/core';
import { TmuxSessionHandler } from '@mcp-tuikit/tmux';
import { AlacrittyBackend } from './backends/AlacrittyBackend.js';
// import { CmdBackend } from './backends/CmdBackend.js';
import { GhosttyBackend } from './backends/GhosttyBackend.js';
import { GnomeTerminalBackend } from './backends/GnomeTerminalBackend.js';
import { ITerm2Backend } from './backends/ITerm2Backend.js';
import { KittyBackend } from './backends/KittyBackend.js';
import { KonsoleBackend } from './backends/KonsoleBackend.js';
import { MacTerminalAppBackend } from './backends/MacTerminalAppBackend.js';
import { PowershellBackend } from './backends/PowershellBackend.js';
import { WezTermBackend } from './backends/WezTermBackend.js';
import { WindowsTerminalBackend } from './backends/WindowsTerminalBackend.js';
import { PlaywrightBackend } from './PlaywrightBackend.js';
import { resolveSnapshotStrategy } from './snapshotters/index.js';

export class BackendFactory {
  static create(backendConfig: Terminal): TerminalBackend {
    const sessionHandler = new TmuxSessionHandler();
    const snapshotStrategy = resolveSnapshotStrategy(backendConfig);

    const configLower = backendConfig.toLowerCase();

    if (configLower === 'xterm.js') {
      return new PlaywrightBackend(sessionHandler, snapshotStrategy);
    }

    if (configLower === 'iterm2') {
      return new ITerm2Backend(sessionHandler, snapshotStrategy);
    }

    if (configLower === 'macos-terminal') {
      return new MacTerminalAppBackend(sessionHandler, snapshotStrategy);
    }

    if (configLower === 'alacritty') {
      return new AlacrittyBackend(sessionHandler, snapshotStrategy, SpawnerFactory.create('open'));
    }

    if (configLower === 'ghostty') {
      return new GhosttyBackend(sessionHandler, snapshotStrategy, SpawnerFactory.create('open'));
    }

    if (configLower === 'wezterm') {
      return new WezTermBackend(sessionHandler, snapshotStrategy, SpawnerFactory.create('native'));
    }

    if (configLower === 'kitty') {
      return new KittyBackend(sessionHandler, snapshotStrategy, SpawnerFactory.create('native'));
    }

    if (configLower === 'konsole') {
      return new KonsoleBackend(sessionHandler, snapshotStrategy, SpawnerFactory.create('native'));
    }

    if (configLower === 'gnome-terminal') {
      return new GnomeTerminalBackend(sessionHandler, snapshotStrategy, SpawnerFactory.create('native'));
    }

    if (configLower === 'windows-terminal') {
      return new WindowsTerminalBackend(sessionHandler, snapshotStrategy, SpawnerFactory.create('native'));
    }

    if (configLower === 'powershell') {
      return new PowershellBackend(sessionHandler, snapshotStrategy, SpawnerFactory.create('native'), 'powershell.exe');
    }

    if (configLower === 'pwsh') {
      return new PowershellBackend(sessionHandler, snapshotStrategy, SpawnerFactory.create('native'), 'pwsh.exe');
    }

    // if (configLower === 'cmd') {
    //   return new CmdBackend(sessionHandler, snapshotStrategy, SpawnerFactory.create('native'));
    // }

    throw new Error(`Unknown terminal backend: ${backendConfig}`);
  }
}
