import { TerminalBackend, SessionHandler, SnapshotStrategy } from '@mcp-tuikit/core';
import { spawnAppleScriptTerminal, runAppleScriptClose } from './AppleScriptUtils.js';

// jscpd:ignore-start
export class ITerm2Backend extends TerminalBackend {
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
      'iTerm',
      (tmuxCmd) => `create window with default profile command "${tmuxCmd}"`,
      `select targetWindow`,
    );

    this._spawnResult = { windowHandle: this._windowId };
  }

  async close(): Promise<void> {
    if (this._windowId) {
      await runAppleScriptClose('iTerm', `set targetWindow to window id ${this._windowId}\nclose targetWindow`);
    }
  }
}
