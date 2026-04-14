import { execFile, exec } from 'node:child_process';
import { promisify } from 'node:util';
import { SnapshotStrategy } from '@mcp-tuikit/core';

const execAsync = promisify(exec);

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
 * Returns the frontmost CGWindowNumber for a given app name using CGWindowListCopyWindowInfo.
 * Works for apps that have no AppleScript dictionary (e.g. Alacritty).
 */
async function getWindowIdViaCGWindowList(appName: string): Promise<string> {
  const script = `
import Cocoa
let target = "${appName}".lowercased()
let opts = CGWindowListOption([.optionAll])
let wins = CGWindowListCopyWindowInfo(opts, kCGNullWindowID) as? [[String: Any]] ?? []
for w in wins {
    let owner = (w[kCGWindowOwnerName as String] as? String ?? "").lowercased()
    guard owner.contains(target) else { continue }
    guard let wid = w[kCGWindowNumber as String] as? Int else { continue }
    // Skip off-screen and zero-size windows — they cannot be captured by screencapture
    let onScreen = w[kCGWindowIsOnscreen as String] as? Bool ?? false
    guard onScreen else { continue }
    let bounds = w[kCGWindowBounds as String] as? [String: Any] ?? [:]
    let w_ = bounds["Width"] as? Int ?? 0
    let h_ = bounds["Height"] as? Int ?? 0
    guard w_ > 0 && h_ > 0 else { continue }
    print(wid)
    break
}
`;
  const { stdout } = await execAsync(`swift - << 'SWIFTEOF'\n${script}\nSWIFTEOF`);
  const windowId = stdout.trim();
  if (!windowId || isNaN(Number(windowId))) {
    throw new Error(`No window found for app "${appName}" via CGWindowList`);
  }
  return windowId;
}

/**
 * Helper to generate the correct AppleScript to get the Window ID for known terminal apps.
 * Returns null for apps that need CGWindowList instead (no AppleScript dictionary).
 */
function getAppleScriptForApp(appName: string): string | null {
  const nameLower = appName.toLowerCase();

  if (nameLower.includes('iterm')) {
    return `tell application "iTerm" to activate\ntell application "iTerm" to get id of window 1`;
  }
  // WezTerm, Ghostty, and Alacritty have no usable AppleScript window-ID API — use CGWindowList path
  if (nameLower.includes('wezterm') || nameLower.includes('ghostty') || nameLower.includes('alacritty')) {
    return null;
  }

  // Generic fallback — try AppleScript
  return `tell application "${appName}" to activate\ntell application "${appName}" to get id of window 1`;
}

/**
 * Gets the window ID of the frontmost window of the specified application.
 * Uses AppleScript for apps with a dictionary; CGWindowList for those without (e.g. Alacritty).
 */
async function getWindowId(appName: string): Promise<string> {
  const script = getAppleScriptForApp(appName);

  if (script === null) {
    return getWindowIdViaCGWindowList(appName);
  }

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
  timeoutMs: number = 30_000,
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

  // Bring the target app to front so its window has a backing store and can be captured.
  // Alacritty has no AppleScript dictionary, so we use `open -a` to activate it.
  await execAsync(`open -a "${appName}"`).catch(() => {
    // Best-effort — ignore if activation fails
  });
  // Allow the window compositor to render a frame before capturing
  await delay(500);

  // Retry screencapture a few times in case the first attempt hits a blank frame.
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // -x suppress sound, -o no shadow
      await execFileAsync('screencapture', ['-x', '-o', '-l', windowId, outputPath]);
      return;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error('screencapture failed');
      await delay(1000);
    }
  }

  throw new Error(`Failed to capture window: ${lastError?.message}`);
}

/**
 * macOS SnapshotStrategy implementation.
 *
 * Wraps `captureMacOsWindow` — uses AppleScript + screencapture for iTerm2,
 * and CGWindowList + screencapture for Alacritty, WezTerm, and Ghostty.
 *
 * @param appName  The terminal application name as returned by `getBackendConfig()`
 *                 (e.g. 'iterm2', 'wezterm', 'alacritty', 'ghostty').
 */
export class MacOsSnapshotStrategy implements SnapshotStrategy {
  constructor(private readonly appName: string) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async capture(outputPath: string, _cols: number, _rows: number, _tmuxSession: string): Promise<void> {
    await captureMacOsWindow(this.appName, outputPath);
  }
}
