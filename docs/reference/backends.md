# Native Backends

`mcp-tuikit` supports a variety of terminal backends. The backend defines _where_ the TUI application is rendered. This is extremely useful for verifying that a TUI renders correctly on a specific terminal emulator.

By default, the backend is determined based on your OS and installed dependencies, but it can be overridden.

## Supported Terminals

### Cross-Platform

- **xterm.js (Playwright):** The most robust headless backend. It spawns a hidden Playwright browser, loads `xterm.js`, and pipes the PTY into it. Excellent for CI environments.
- **Alacritty**
- **WezTerm**
- **Kitty**
- **Ghostty**

### macOS Specific

- **Terminal.app (MacTerminalAppBackend)**
- **iTerm2**

### Linux Specific

- **Gnome Terminal**
- **Konsole**

### Windows Specific

- **Windows Terminal**
- **Cmd**
- **Powershell**

## How Backend Resolution Works

The server attempts to use the most stable native backend available in your environment. If visual snapshots fail or a UI is not requested, it falls back to headless abstractions.

You can explicitly force a backend by setting the `MCP_TUIKIT_BACKEND` environment variable before starting the MCP server.

```bash
export MCP_TUIKIT_BACKEND="Alacritty"
npx @dragoscirjan/mcp-tuikit
```
