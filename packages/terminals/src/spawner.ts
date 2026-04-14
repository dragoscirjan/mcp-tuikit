import { exec } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { execa } from 'execa';

const execAsync = promisify(exec);

/**
 * Result returned by spawnTerminal.
 * `windowHandle` is an opaque string for AppleScript-based terminals.
 * `pid` is present when the terminal process was spawned directly (e.g. Alacritty)
 * and must be used to terminate it via closeTerminal.
 */
export interface SpawnResult {
  windowHandle: string | null;
  pid?: number;
  /** Path to a temp config file that must be cleaned up after the process exits. */
  tmpConfig?: string;
}

/**
 * Spawns a detached terminal process directly (not via AppleScript), waits for
 * the compositor to render the first frame, then returns the PID.
 *
 * This is the standard pattern for Alacritty, WezTerm, Ghostty, and any other
 * terminal launched via its bundle binary.  Add new terminals by providing their
 * binary path and argv — the lifecycle management (kill + tmpConfig cleanup) is
 * handled generically by closeTerminal().
 */
async function spawnDirectProcess(
  bin: string,
  args: string[],
  startupDelayMs: number = 3000,
  tmpConfig?: string,
): Promise<SpawnResult> {
  const proc = execa(bin, args, { detached: true, stdio: 'ignore' });
  // Suppress the unhandled rejection execa emits when we SIGTERM the process later
  proc.catch(() => {});
  const pid = proc.pid;
  await new Promise((r) => setTimeout(r, startupDelayMs));
  return { windowHandle: null, pid, tmpConfig };
}

/**
 * Spawns a terminal window attached to the given tmux session.
 * Returns a SpawnResult that can be passed to closeTerminal().
 */
export async function spawnTerminal(
  backend: string,
  tmuxSessionName: string,
  cols: number = 120,
  rows: number = 40,
  width?: number,
  height?: number,
): Promise<SpawnResult> {
  // Derive pixel dimensions from cols/rows heuristic if not explicitly provided
  // Add 50px padding to each dimension for window chrome / decorations
  const pixelWidth = width ?? cols * 10 + 50;
  const pixelHeight = height ?? rows * 20 + 50;

  switch (backend.toLowerCase()) {
    case 'wezterm': {
      // `wezterm-gui start` opens a new window; `wezterm cli spawn` requires an
      // existing multiplexer and fails when WezTerm is not already running.
      // Pass --config to set the initial window dimensions explicitly — WezTerm
      // defaults to 80x24 which is too small for btop and similar TUI apps.
      const bin = process.env.WEZTERM_BIN ?? '/Applications/WezTerm.app/Contents/MacOS/wezterm-gui';
      return spawnDirectProcess(bin, [
        '--config',
        `initial_cols=${cols}`,
        '--config',
        `initial_rows=${rows}`,
        'start',
        '--',
        'tmux',
        'attach',
        '-t',
        tmuxSessionName,
      ]);
    }

    case 'alacritty': {
      // Write a temp config so Alacritty uses the correct dimensions and attaches
      // to the right tmux session on startup.
      // Use `terminal.shell` (current Alacritty TOML schema; `shell` is deprecated).
      // Keep the file alive for the entire process lifetime — Alacritty watches it
      // for live reload and will error if the file disappears while running.
      const tmpConfig = path.join(os.tmpdir(), `alacritty-tuikit-${Date.now()}.toml`);
      const configContent = [
        `[window.dimensions]`,
        `columns = ${cols}`,
        `lines = ${rows}`,
        ``,
        `[terminal.shell]`,
        `program = "tmux"`,
        `args = ["attach", "-t", "${tmuxSessionName}"]`,
      ].join('\n');
      await fs.writeFile(tmpConfig, configContent, 'utf8');
      // Launch directly (not via `open -a`) so we own the PID and can kill it precisely.
      // The binary is the real Mach-O inside the .app bundle; it still registers with
      // the macOS window server.
      const bin = process.env.ALACRITTY_BIN ?? '/Applications/Alacritty.app/Contents/MacOS/alacritty';
      // tmpConfig is intentionally passed through — closeTerminal() removes it after kill.
      return spawnDirectProcess(bin, ['--config-file', tmpConfig], 3000, tmpConfig);
    }

    case 'ghostty': {
      // On macOS, Ghostty must be launched via `open -na Ghostty.app` — the binary
      // itself prints "launching from CLI is not supported" and exits without opening
      // a window.  `open -na` passes everything after `--args` directly to the app.
      //
      // `-e` takes the *program* as the very next argument; subsequent args are
      // forwarded as argv to that program — so we must split `tmux attach -t <name>`
      // into individual tokens, NOT pass it as a single shell string.
      //
      // We snapshot the ghostty PID set before the launch and diff afterwards so we
      // can kill the exact window later even though `open` itself returns immediately.
      const startupDelayMs = 3000;
      let pidsBefore: Set<number>;
      try {
        const { stdout } = await execAsync('pgrep -x ghostty');
        pidsBefore = new Set(
          stdout
            .trim()
            .split('\n')
            .map(Number)
            .filter((n) => !isNaN(n) && n > 0),
        );
      } catch {
        pidsBefore = new Set();
      }

      // A unique --class per launch prevents macOS from grouping this window
      // into the existing Ghostty app instance (which would open a tab instead
      // of a standalone window).  Every Ghostty config key is available as a
      // CLI arg, so --class=<uuid> is valid and forces a new window group.
      const windowClass = `mcp-tuikit-${randomUUID()}`;
      const ghosttyScript = [
        `open -na Ghostty.app`,
        `--args --class=${windowClass}`,
        `--window-width=${cols} --window-height=${rows}`,
        `-e tmux attach -t ${tmuxSessionName}`,
      ];
      await execAsync(ghosttyScript.join(' '));
      await new Promise((r) => setTimeout(r, startupDelayMs));

      // Find the new Ghostty PID spawned by this open call
      let newPid: number | undefined;
      try {
        const { stdout } = await execAsync('pgrep -x ghostty');
        const pidsAfter = stdout
          .trim()
          .split('\n')
          .map(Number)
          .filter((n) => !isNaN(n) && n > 0);
        newPid = pidsAfter.find((p) => !pidsBefore.has(p));
      } catch {
        // pgrep exits non-zero when no match — Ghostty may not be running yet
      }

      return { windowHandle: null, pid: newPid };
    }

    case 'iterm2': {
      // Create window, size it, attach to tmux session, and return the window ID for later cleanup
      const script = [
        `tell application "iTerm"`,
        `  set newWindow to (create window with default profile)`,
        `  tell newWindow`,
        `    set bounds to {0, 0, ${pixelWidth}, ${pixelHeight}}`,
        `  end tell`,
        `  tell current session of newWindow`,
        `    write text "exec tmux attach -t ${tmuxSessionName}"`,
        `  end tell`,
        `  return id of newWindow`,
        `end tell`,
      ].join('\n');
      const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      return { windowHandle: stdout.trim() || null };
    }

    case 'xterm.js':
      // xterm.js renders snapshots via Playwright — no native window to open.
      return { windowHandle: null, pid: undefined };

    default:
      throw new Error(`Unknown terminal backend: ${backend}`);
  }
}

/**
 * Closes the terminal window identified by the SpawnResult returned from spawnTerminal().
 */
export async function closeTerminal(backend: string, result: SpawnResult): Promise<void> {
  // If we have a direct PID, kill the process precisely (e.g. Alacritty spawned via execa)
  if (result.pid != null) {
    try {
      process.kill(result.pid, 'SIGTERM');
      // Give it 500 ms to exit gracefully, then force-kill
      await new Promise((r) => setTimeout(r, 500));
      try {
        process.kill(result.pid, 'SIGKILL');
      } catch {
        /* already gone */
      }
    } catch {
      // Process may have already exited — ignore
    }
    // Remove the temp config now that the process is gone
    if (result.tmpConfig) {
      await fs.unlink(result.tmpConfig).catch(() => {});
    }
    return;
  }

  // AppleScript-based terminals: close by window handle
  if (result.windowHandle == null) return;

  switch (backend.toLowerCase()) {
    case 'iterm2': {
      const script = [
        `tell application "iTerm"`,
        `  set targetWindow to window id ${result.windowHandle}`,
        `  close targetWindow`,
        `end tell`,
      ].join('\n');
      await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      break;
    }
    default:
      // Other backends: no-op — those terminals exit when the tmux session is killed
      break;
  }
}
