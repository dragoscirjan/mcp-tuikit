import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { TerminalBackend, SessionHandler, SnapshotStrategy } from '@mcp-tuikit/core';

const execAsync = promisify(exec);

export class MacTerminalAppBackend extends TerminalBackend {
  constructor(sessionHandler: SessionHandler, snapshotStrategy: SnapshotStrategy) {
    super(sessionHandler, snapshotStrategy);
  }

  async spawn(): Promise<void> {
    if (!this._sessionName) throw new Error('Cannot spawn Terminal without an active session ID');

    const tmuxSessionName = this._sessionName;

    const { stdout: tmuxBin } = await execAsync('which tmux');
    const tmuxAbsPath = tmuxBin.trim();

    const [pixelWidth, pixelHeight] = this.sizeInPixels(this.cols, this.rows);

    const tmuxCmd = `${tmuxAbsPath} attach -t ${tmuxSessionName}`;
    const script = [
      `tell application "Terminal"`,
      `  set newTab to do script "${tmuxCmd}"`,
      `  set newWindow to front window`,
      `  set bounds of newWindow to {0, 0, ${pixelWidth}, ${pixelHeight}}`,
      `  return id of newWindow`,
      `end tell`,
    ].join('\n');

    const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
    const startupDelayMs = 3000;
    await new Promise((r) => setTimeout(r, startupDelayMs));

    this._windowId = stdout.trim() || null;
    this._spawnResult = { windowHandle: this._windowId };
  }

  async close(): Promise<void> {
    if (this._windowId) {
      const script = [
        `tell application "Terminal"`,
        `  close (every window whose id is ${this._windowId})`,
        `end tell`,
      ].join('\n');
      await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`).catch(() => {});
    }
  }
}
