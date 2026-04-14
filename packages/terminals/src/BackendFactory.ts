import { TerminalBackend } from '@mcp-tuikit/core';
import { TmuxSessionHandler } from '@mcp-tuikit/tmux';
import { NativeTerminalBackend } from './NativeTerminalBackend.js';
import { PlaywrightBackend } from './PlaywrightBackend.js';
import { resolveSnapshotStrategy } from './snapshotters/index.js';

export class BackendFactory {
  static create(backendConfig: string): TerminalBackend {
    const sessionHandler = new TmuxSessionHandler();
    const snapshotStrategy = resolveSnapshotStrategy(backendConfig);

    if (backendConfig === 'xterm.js') {
      return new PlaywrightBackend(sessionHandler, snapshotStrategy);
    } else {
      return new NativeTerminalBackend(backendConfig, sessionHandler, snapshotStrategy);
    }
  }
}
