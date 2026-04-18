import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

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

  const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
  return stdout.trim();
}

export async function runAppleScriptClose(appName: string, closeCmd: string): Promise<void> {
  const script = [`tell application "${appName}"`, `  ${closeCmd}`, `end tell`].join('\n');
  await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`).catch(() => {});
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

  const { stdout: tmuxBin } = await execAsync('which tmux');
  const tmuxAbsPath = tmuxBin.trim();

  const tmuxCmd = `${tmuxAbsPath} attach -t ${sessionName}`;

  const windowId = await runAppleScriptSpawn(appName, spawnCmdFn(tmuxCmd), pixelWidth, pixelHeight, focusCmd).catch(
    () => null,
  );

  const startupDelayMs = 3000;
  await new Promise((r) => setTimeout(r, startupDelayMs));

  return windowId;
}
