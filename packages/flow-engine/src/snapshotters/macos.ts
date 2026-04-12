import { execFile } from 'node:child_process';

/**
 * Helper to wrap execFile in a promise
 */
function execFileAsync(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(command, args, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout: stdout as string, stderr: stderr as string });
      }
    });
  });
}

/**
 * Helper to generate the correct AppleScript to get the Window ID for known terminal apps.
 */
function getAppleScriptForApp(appName: string): string {
  // Variations based on the app
  const nameLower = appName.toLowerCase();

  // iTerm, WezTerm, Alacritty, Ghostty
  if (nameLower.includes('iterm')) {
    return `tell application "iTerm" to activate\ntell application "iTerm" to get id of window 1`;
  }
  if (nameLower.includes('wezterm')) {
    return `tell application "WezTerm" to activate\ntell application "WezTerm" to get id of window 1`;
  }
  if (nameLower.includes('alacritty')) {
    return `tell application "Alacritty" to activate\ntell application "Alacritty" to get id of window 1`;
  }
  if (nameLower.includes('ghostty')) {
    return `tell application "Ghostty" to activate\ntell application "Ghostty" to get id of window 1`;
  }

  // Fallback
  return `tell application "${appName}" to activate\ntell application "${appName}" to get id of window 1`;
}

/**
 * Gets the window ID of the frontmost window of the specified application.
 */
async function getWindowId(appName: string): Promise<string> {
  const script = getAppleScriptForApp(appName);
  try {
    const { stdout } = await execFileAsync('osascript', ['-e', script]);
    const windowId = stdout.trim();
    if (!windowId || isNaN(Number(windowId))) {
      throw new Error(`Invalid window ID returned: ${windowId}`);
    }
    return windowId;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to get window ID: ${error.message}`);
    }
    throw new Error('Failed to get window ID: unknown error');
  }
}

/**
 * Delays execution for a specified number of milliseconds.
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Captures the frontmost window of a macOS application and saves it to a file.
 *
 * @param appName The name of the application (e.g., 'iTerm', 'WezTerm')
 * @param outputPath The path where the screenshot will be saved
 * @param timeoutMs Maximum time to wait for the window to appear (in ms)
 * @param pollIntervalMs How often to check for the window (in ms)
 */
export async function captureMacOsWindow(
  appName: string,
  outputPath: string,
  timeoutMs: number = 5000,
  pollIntervalMs: number = 200,
): Promise<void> {
  let windowId: string | null = null;
  const startTime = Date.now();

  // Poll for the window ID until we find it or timeout
  while (Date.now() - startTime < timeoutMs) {
    try {
      windowId = await getWindowId(appName);
      break;
    } catch {
      await delay(pollIntervalMs);
    }
  }

  if (!windowId) {
    throw new Error(`Timeout waiting for window of app "${appName}" after ${timeoutMs}ms.`);
  }

  try {
    // Run screencapture
    await execFileAsync('screencapture', ['-l', windowId, outputPath]);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to capture window: ${error.message}`);
    }
    throw new Error('Failed to capture window: unknown error');
  }
}
