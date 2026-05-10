# @dragoscirjan/mcp-tuikit-terminals

Terminal backend implementations and factory abstraction for `mcp-tuikit`.

It includes adapters for multiple terminal emulators:

- **Native GPU-Accelerated**: Alacritty, WezTerm, Ghostty, Kitty
- **Standard**: macOS Terminal.app, iTerm2, Gnome Terminal, Windows Terminal, PowerShell
- **Headless Web**: `xterm.js` (via Playwright)

The `BackendFactory` automatically provisions the correct class based on the agent's configuration.
