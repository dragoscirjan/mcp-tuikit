import { TerminalBackend, SpawnerFactory } from '@mcp-tuikit/core';
import { TmuxSessionHandler } from '@mcp-tuikit/tmux';
import { AlacrittyBackend } from './backends/AlacrittyBackend.js';
import { GhosttyBackend } from './backends/GhosttyBackend.js';
import { ITerm2Backend } from './backends/ITerm2Backend.js';
import { KittyBackend } from './backends/KittyBackend.js';
import { MacTerminalAppBackend } from './backends/MacTerminalAppBackend.js';
import { WezTermBackend } from './backends/WezTermBackend.js';
import { PlaywrightBackend } from './PlaywrightBackend.js';
import { resolveSnapshotStrategy } from './snapshotters/index.js';

export type Terminal = 'macos-terminal' | 'iterm2' | 'alacritty' | 'wezterm' | 'ghostty' | 'kitty' | 'xterm.js';

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

    throw new Error(`Unknown terminal backend: ${backendConfig}`);
  }
}
