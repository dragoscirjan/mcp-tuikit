/**
 * Returns the terminal backend to use.
 *
 * Controlled by TUIKIT_TERMINAL env var.
 * Supported values: xterm.js | iterm2 | alacritty | wezterm | ghostty | konsole | gnome-terminal
 * Default: 'xterm.js'
 */
export function getBackendConfig(): string {
  return process.env.TUIKIT_TERMINAL ?? 'xterm.js';
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
