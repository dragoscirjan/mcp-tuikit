import { TerminalBackend, SessionHandler, SnapshotStrategy } from '@mcp-tuikit/core';
import { spawnAppleScriptTerminal, runAppleScriptClose } from './AppleScriptUtils.js';

// jscpd:ignore-start
export class MacTerminalAppBackend extends TerminalBackend {
  constructor(sessionHandler: SessionHandler, snapshotStrategy: SnapshotStrategy) {
    super(sessionHandler, snapshotStrategy);
  }

  async spawn(): Promise<void> {
    // jscpd:ignore-end
    const [pixelWidth, pixelHeight] = this.sizeInPixels(this.cols, this.rows);

    this._windowId = await spawnAppleScriptTerminal(
      this._sessionName,
      pixelWidth,
      pixelHeight,
      'Terminal',
      (tmuxCmd) => `set newTab to do script "${tmuxCmd}"`,
      `set frontmost of targetWindow to true`,
    );

    this._spawnResult = { windowHandle: this._windowId };
  }

  async close(): Promise<void> {
    if (this._windowId) {
      await runAppleScriptClose('Terminal', `close (every window whose id is ${this._windowId})`);
    }
  }
}
