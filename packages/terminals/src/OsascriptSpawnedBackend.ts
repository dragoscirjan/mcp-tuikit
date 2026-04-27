import { execa } from 'execa';
import { SessionHandler } from '@mcp-tuikit/core';
import { TerminalBackend, IdType } from './TerminalBackend.js';
import { SnapshotStrategy } from './SnapshotStrategy.js';

export async function runAppleScriptSpawn(
  appName: string,
  spawnCmd: string,
  pixelWidth: number,
  pixelHeight: number,
  focusCmd: string,
): Promise<string> {
  const script = [
    `tell application "${appName}"`,
    `  launch`,
    `  set beforeIds to get id of every window`,
    `  ${spawnCmd}`,
    `  delay 0.5`,
    `  set newWindowId to missing value`,
    `  set afterIds to get id of every window`,
    `  repeat with aId in afterIds`,
    `    if aId is not in beforeIds then`,
    `      set newWindowId to aId`,
    `      exit repeat`,
    `    end if`,
    `  end repeat`,
    `  if newWindowId is not missing value then`,
    `    set targetWindow to window id newWindowId`,
    `    set bounds of targetWindow to {0, 0, ${pixelWidth}, ${pixelHeight}}`,
    `    ${focusCmd}`,
    `    activate`,
    `    return (newWindowId as string)`,
    `  else`,
    `    return (id of front window) as string`,
    `  end if`,
    `end tell`,
  ].join('\n');

  const { stdout } = await execa('osascript', ['-e', script]);
  return stdout.trim();
}

export async function runAppleScriptClose(appName: string, closeCmd: string): Promise<void> {
  const script = [`tell application "${appName}"`, `  ${closeCmd}`, `end tell`].join('\n');
  await execa('osascript', ['-e', script]).catch(() => {});
}

export async function spawnAppleScriptTerminal(
  sessionName: string | null | undefined,
  pixelWidth: number,
  pixelHeight: number,
  appName: string,
  spawnCmdFn: (tmuxCmd: string) => string,
  focusCmd: string,
): Promise<string | null> {
  if (!sessionName) throw new Error(`Cannot spawn ${appName} without an active session ID`);

  const { stdout: tmuxBin } = await execa('which', ['tmux']);
  const tmuxAbsPath = tmuxBin;

  const tmuxCmd = `${tmuxAbsPath} attach -t ${sessionName}`;

  const windowId = await runAppleScriptSpawn(appName, spawnCmdFn(tmuxCmd), pixelWidth, pixelHeight, focusCmd).catch(
    () => null,
  );

  const startupDelayMs = 3000;
  await new Promise((r) => setTimeout(r, startupDelayMs));

  return windowId;
}

export abstract class OsascriptSpawnedBackend extends TerminalBackend {
  /**
   * The name of the macOS application to target via AppleScript (e.g., "iTerm", "Terminal").
   */
  protected abstract get appName(): string;

  /**
   * The AppleScript command required to focus the newly spawned window.
   */
  protected abstract get generateFocusCmd(): string;

  constructor(sessionHandler: SessionHandler, snapshotStrategy: SnapshotStrategy) {
    super(sessionHandler, snapshotStrategy);
  }

  /**
   * Generates the AppleScript command to create a new window/tab running the given tmux command.
   * @param tmuxCmd The tmux attach command to run in the new window.
   */
  protected abstract generateSpawnCmd(tmuxCmd: string): string;

  /**
   * Generates the AppleScript command to close a specific window by its ID.
   * @param windowId The ID of the window to close.
   */
  protected abstract generateCloseCmd(windowId: IdType): string;

  async spawn(): Promise<void> {
    /* jscpd:ignore-end */
    const [pixelWidth, pixelHeight] = this.sizeInPixels(this.cols, this.rows);

    this._windowId = await spawnAppleScriptTerminal(
      this._sessionName,
      pixelWidth,
      pixelHeight,
      this.appName,
      (tmuxCmd) => this.generateSpawnCmd(tmuxCmd),
      this.generateFocusCmd,
    );

    this._spawnResult = { windowHandle: this._windowId };
  }

  async close(): Promise<void> {
    if (this._windowId) {
      await runAppleScriptClose(this.appName, this.generateCloseCmd(this._windowId));
    }
  }
}
