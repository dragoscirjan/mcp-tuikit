# Setup & Configuration

This guide explains how to install and configure the `mcp-tuikit` server locally on your machine.

## Prerequisites

Before starting, ensure your system has the following requirements:

1. **Node.js**: `mcp-tuikit` is an npm package running via Node.js.
2. **Tmux**: The server uses `tmux` to manage robust, headless background terminal sessions. Ensure `tmux` is installed and available in your `PATH` (`which tmux`).
3. _(Optional)_ **Native Terminals**: If you want to take graphical `.png` screenshots using native emulators (Ghostty, Alacritty, etc.), ensure they are installed. Otherwise, the fallback `xterm.js` backend works completely headless for basic snapshotting.

---

## Installation

The easiest way to use `mcp-tuikit` is to run it on-demand via `npx` (which avoids installing globally). When you configure your LLM, it will start the server automatically.

```bash
npx -y @dragoscirjan/mcp-tuikit
```

## Environment Variables

You can customize the behavior of the server using environment variables. These are especially useful when passing the environment up to your LLM configuration.

| Variable             | Description                                                                                                                | Default       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `MCP_TUIKIT_BACKEND` | Forces a specific backend to run terminal tests (e.g., `ghostty`, `kitty`, `alacritty`, `wezterm`, `konsole`, `xterm.js`). | Auto-detected |
| `MCP_TUIKIT_DEBUG`   | Enables verbose debug logging for troubleshooting session creation and snapshots.                                          | `false`       |
| `TMUX_TMPDIR`        | Specifies the directory where tmux places its domain sockets.                                                              | OS tmp dir    |

_Example running with a specific backend:_

```bash
MCP_TUIKIT_BACKEND=ghostty npx -y @dragoscirjan/mcp-tuikit
```
