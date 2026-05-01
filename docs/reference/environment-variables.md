# Environment Variables

`mcp-tuikit` uses several environment variables to customize its execution, backends, and headless behavior. You can set these in your terminal profile or provide them via your MCP client configuration (such as in the Claude Desktop JSON or Cursor config).

## Core Configuration

| Variable             | Description                                                                                                                                          | Default             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `TUIKIT_TERMINAL`    | The default terminal backend to use. Options include `xterm.js` (browser-based via Playwright), `wezterm`, `kitty`, `konsole`, and `gnome-terminal`. | `xterm.js`          |
| `TUIKIT_HEADLESS`    | Controls headless execution. Set to `0` to spawn visible, debuggable windows, or `1` for headless CI/background execution.                           | `1` (Headless mode) |
| `TUIKIT_TMUX_BINARY` | Path to the `tmux` executable used to wrap and persist terminal sessions.                                                                            | `tmux`              |

## Native Terminal Overrides

If your preferred native terminal emulator is not in your system's `PATH`, you can explicitly set its location using these variables.

| Variable             | Description                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| `WEZTERM_BIN`        | Path to the WezTerm executable.                                                                     |
| `KITTY_BIN`          | Path to the Kitty executable (defaults to `/Applications/kitty.app/Contents/MacOS/kitty` on macOS). |
| `KONSOLE_BIN`        | Path to the KDE Konsole executable.                                                                 |
| `GNOME_TERMINAL_BIN` | Path to the GNOME Terminal executable.                                                              |

## Snapshotting & Browsers

| Variable                              | Description                                                                                                                                              |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` | A custom path to the Chromium binary used by Playwright for `xterm.js` snapshots. Useful if you want to bypass downloading Playwright's bundled browser. |

## Linux Display & Wayland/X11 (Advanced)

For Linux systems, `mcp-tuikit` attempts to read and orchestrate your X11/Wayland display variables, particularly for managing headless graphics or taking native snapshots. You generally do not need to set these manually unless you are configuring a custom headless environment.

| Variable                      | Description                                                                                                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WAYLAND_DISPLAY` / `DISPLAY` | Used by native terminal emulators to determine which window system to attach to.                                                                                             |
| `XDG_SESSION_TYPE`            | Used by `mcp-tuikit` to detect if the session is running `wayland` or `x11`.                                                                                                 |
| `XDG_CURRENT_DESKTOP`         | Used alongside `SWAYSOCK` and `HYPRLAND_INSTANCE_SIGNATURE` to detect specific Linux window managers for routing native screenshot commands (e.g., `grim` on Sway/Hyprland). |
| `WLR_BACKENDS`                | Used internally by the virtual session manager to create headless Wayland compositors (set to `headless`).                                                                   |
| `XDG_RUNTIME_DIR`             | Used to configure where temporary socket files are created during headless execution.                                                                                        |
