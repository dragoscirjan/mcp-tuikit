# Native Backends

`mcp-tuikit` uses different "backends" to run the terminal application and take visual `.png` snapshots. These backends are automatically detected based on the OS and installed software, but you can explicitly force a backend using the `MCP_TUIKIT_BACKEND` environment variable.

The backend only matters for visual `.png` snapshots and rendering visual terminal windows on your host machine. The underlying state and text `txt` output is always managed purely by `tmux` headless sessions.

---

## 1. Headless Fallback (`xterm.js`)

If no native graphical terminal is found, or if running in a pure headless CI environment (e.g. GitHub Actions), `mcp-tuikit` falls back to `xterm.js`.
It spins up a hidden Playwright Chromium browser, connects it to the `tmux` session via websockets, and uses the browser to render the ANSI colors and take a `.png` screenshot.

This ensures you can always get graphical representations of your TUIs, even without a desktop environment.

---

## 2. Linux & macOS Terminals

`mcp-tuikit` has deep integration with the following native terminal emulators. It will spawn the application in a new window, execute your commands, take native OS-level screenshots (like `gnome-screenshot` or `spectacle` on Linux, and `screencapture` on macOS), and close the window.

### Ghostty

A fast, cross-platform, GPU-accelerated terminal emulator written in Zig.

- **Variable**: `MCP_TUIKIT_BACKEND=ghostty`

### Alacritty

A popular OpenGL terminal emulator.

- **Variable**: `MCP_TUIKIT_BACKEND=alacritty`

### Kitty

A fast, feature-rich, GPU-based terminal emulator.

- **Variable**: `MCP_TUIKIT_BACKEND=kitty`

### WezTerm

A GPU-accelerated cross-platform terminal emulator and multiplexer written in Rust.

- **Variable**: `MCP_TUIKIT_BACKEND=wezterm`

---

## 3. macOS Exclusives

### iTerm2

The standard macOS replacement for Terminal.app.

- **Variable**: `MCP_TUIKIT_BACKEND=iterm2`

### Terminal.app

The default macOS terminal.

- **Variable**: `MCP_TUIKIT_BACKEND=macos-terminal`

---

## 4. Linux Exclusives

### Konsole

The default terminal emulator for the KDE Plasma desktop.

- **Variable**: `MCP_TUIKIT_BACKEND=konsole`

### GNOME Terminal

The default terminal emulator for the GNOME desktop environment (and default on Ubuntu).

- **Variable**: `MCP_TUIKIT_BACKEND=gnome-terminal`
