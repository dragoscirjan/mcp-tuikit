import { Terminal } from './Terminal.js';

/**
 * Returns the terminal backend to use.
 *
 * Controlled by TUIKIT_TERMINAL env var.
 * Supported values: xterm.js | iterm2 | macos-terminal | alacritty | wezterm | ghostty | kitty | konsole | gnome-terminal
 * Default: 'xterm.js'
 */
export function getBackendConfig(): Terminal {
  // Note: We no longer force 'xterm.js' when TUIKIT_HEADLESS=1, because Linux now supports headless runs for native terminals
  return (process.env.TUIKIT_TERMINAL as Terminal) || 'xterm.js';
}

/**
 * Returns whether to open a visible (headed) terminal window when creating a session.
 *
 * Controlled by TUIKIT_HEADLESS env var.
 *   TUIKIT_HEADLESS=1 → headless (no window)
 *   TUIKIT_HEADLESS=0 or unset → headed (open a visible window)
 *
 * Default: headed (true).
 */
export function isHeadedMode(): boolean {
  return process.env.TUIKIT_HEADLESS !== '1';
}
