import { execa } from 'execa';
import { SnapshotStrategy } from './SnapshotStrategy.js';

async function getWindowIdViaCGWindowList(appName: string): Promise<string> {
  const script = `
import Cocoa
let target = "${appName}".lowercased()
let opts = CGWindowListOption([.optionAll])
let wins = CGWindowListCopyWindowInfo(opts, kCGNullWindowID) as? [[String: Any]] ?? []
var foundIds = [Int]()
for w in wins {
    let owner = (w[kCGWindowOwnerName as String] as? String ?? "").lowercased()
    guard owner.contains(target) else { continue }
    guard let wid = w[kCGWindowNumber as String] as? Int else { continue }
    foundIds.append(wid)
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
if foundIds.isEmpty {
    fputs("No window matched owner: \\(target)\\n", stderr)
} else {
    fputs("Found IDs but none passed onscreen/size filters: \\(foundIds)\\n", stderr)
}
`;
  const { stdout, stderr } = await execa('swift', ['-'], { input: script });
  const windowId = stdout.trim();
  if (!windowId || isNaN(Number(windowId))) {
    throw new Error(`No window found for app "${appName}" via CGWindowList. stderr: ${stderr}`);
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
  if (nameLower === 'macos-terminal') {
    return `tell application "Terminal" to activate\ntell application "Terminal" to get id of window 1`;
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
    const { stdout } = await execa('osascript', ['-e', script]);
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
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, process.env.NODE_ENV === 'test' ? 1 : ms));

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
  spawnResult?: unknown,
): Promise<void> {
  let windowId: string | null = null;

  if (spawnResult && typeof spawnResult === 'object' && 'windowHandle' in spawnResult && spawnResult.windowHandle) {
    windowId = String(spawnResult.windowHandle);
  } else {
    const startTime = Date.now();
    let lastErr: Error | null = null;

    // Poll for the window ID until we find it or timeout
    while (Date.now() - startTime < timeoutMs) {
      try {
        windowId = await getWindowId(appName);
        break;
      } catch (err) {
        lastErr = err as Error;
        await delay(pollIntervalMs);
      }
    }

    if (!windowId && lastErr) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Last getWindowId error:', lastErr);
      }
    }
  }

  if (!windowId) {
    throw new Error(`Timeout waiting for window of app "${appName}" after ${timeoutMs}ms.`);
  }

  // Bring the target app to front so its window has a backing store and can be captured.
  // Alacritty has no AppleScript dictionary, so we use `open -a` to activate it.
  const actualAppName = appName === 'macos-terminal' ? 'Terminal' : appName;
  await execa('open', ['-a', actualAppName]).catch(() => {
    // Best-effort — ignore if activation fails
  });
  // Allow the window compositor to render a frame before capturing.
  // iTerm2 needs extra time after tmux attach for the visual buffer to update.
  await delay(1500);

  // Retry screencapture a few times in case the first attempt hits a blank frame.
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // -x suppress sound, -o no shadow
      await execa('screencapture', ['-x', '-o', '-l', windowId, outputPath]);
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

  async capture(
    outputPath: string,
    _cols: number,
    _rows: number,
    _tmuxSession: string,
    spawnResult?: unknown,
  ): Promise<void> {
    await captureMacOsWindow(this.appName, outputPath, 30_000, 200, spawnResult);
  }
}
