# mcp-tuikit

**Model Context Protocol server for Text User Interface (TUI) and headless terminal automation**

[![npm version](https://img.shields.io/npm/v/@dragoscirjan/mcp-tuikit.svg)](https://www.npmjs.com/package/@dragoscirjan/mcp-tuikit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that enables AI agents (Claude Code, Cursor, Windsurf, OpenCode) to launch, interact with, and observe any terminal application in isolated sessions. `mcp-tuikit` uses `tmux` and various native terminal backends to let AI interact with complex TUIs like `nvim`, `btop`, `lazygit`, or standard shells, providing both text and visual (PNG) snapshotting of terminal states.

**🚀 Fully Cross-OS Compatible**: Works seamlessly across macOS, Linux, and Windows.

## Table of Contents

- [Why mcp-tuikit?](#why-mcp-tuikit)
- [Use Cases](#use-cases)
- [Quick Start](#quick-start)
- [Available Tools](#available-tools)
- [How It Works](#how-it-works)
- [System Requirements & Installation](#system-requirements--installation)
- [Known Issues & Limitations](#known-issues--limitations)
- [Documentation](https://dragoscirjan.github.io/mcp-tuikit/)

## Why mcp-tuikit?

- **Isolated Sessions:** Each session runs in an isolated `tmux` environment. AI interactions do not leak into or disrupt your host terminal.
- **Headless & Visual:** Capture accurate textual screen state and visual PNG screenshots of running TUI applications, even in headless CI environments like `Xvfb`, `Sway`, or `kwin`.
- **Flow Execution Engine:** Execute pre-defined flows (YAML) against terminal instances. Great for integration testing or guiding autonomous agent tasks.
- **Cross-Platform:** Built to support macOS, Linux, and Windows natively. Works with standard terminals (Terminal.app, iTerm2, Gnome Terminal, Windows Terminal) and modern GPU-accelerated emulators (Alacritty, WezTerm, Ghostty, Kitty).

## Use Cases

### Automated CLI/TUI Testing

Run end-to-end tests for your CLI tools or TUI applications. `mcp-tuikit` launches each app in its own session, interacts via emulated keystrokes, and verifies results through text or visual PNG screenshots.

### AI-Driven Terminal Automation

Let AI agents like Claude Code autonomously operate complex terminal environments. The agent can spawn `vim`, send `j`, `k` keystrokes, wait for UI updates, and read the screen state, creating a complete feedback loop.

### Headless CI Integration

Integrate terminal GUI testing into CI/CD pipelines. `mcp-tuikit` supports `xterm.js` via Playwright, or Linux native headless servers (`Sway`, `kwin`, `Xvfb`), making it perfect for GitHub Actions or GitLab CI.

## Quick Start

**1. Install**

```bash
# Install globally via npm
npm install -g @dragoscirjan/mcp-tuikit
```

**2. Configure Claude Code**

```bash
claude mcp add mcp-tuikit -- npx -y @dragoscirjan/mcp-tuikit
```

**3. Configure Cursor** (`~/.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "mcp-tuikit": {
      "command": "npx",
      "args": ["-y", "@dragoscirjan/mcp-tuikit"]
    }
  }
}
```

**4. Use it**

Ask your AI agent:

> "Create a new terminal session, run `btop`, take a visual snapshot of the output, and then close the session."

## Available Tools

| Tool              | Parameters                                       | Description                                                |
| ----------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| `create_session`  | `command`, `cols?`, `rows?`                      | Create a new terminal session running a specific command.  |
| `close_session`   | `session_id`                                     | Close an active terminal session.                          |
| `create_snapshot` | `session_id`, `format` (txt/png/both), `intent?` | Capture a txt and/or png snapshot from an active session.  |
| `send_keys`       | `session_id`, `keys`, `submit?` (bool)           | Send keystrokes to an active session using tmux format.    |
| `wait_for_text`   | `session_id`, `pattern`, `timeout_ms?`           | Wait for a regex pattern to appear in the terminal output. |
| `run_flow`        | `yaml_path?`, `yaml_string?`, `cols?`, `rows?`   | Run a TUI YAML flow and capture artifacts autonomously.    |
| `list_sessions`   | _(none)_                                         | List all active terminal sessions and their states.        |

**Resources:**

- `terminal://session/{id}/screen.txt?maxLines={limit}`: Read the raw plaintext buffer of the active terminal session.

## How It Works

```mermaid
flowchart TD
    Agent["AI Agent (Claude, Cursor)"] <-->|MCP Protocol| Server["mcp-tuikit Server"]

    Server --> |create_session| TMUX["tmux Session"]
    Server --> |send_keys| TMUX
    Server --> |create_snapshot (txt)| TMUX

    TMUX --> |Spawns via Backend| Emulator["Terminal Emulator / Headless Engine"]

    Emulator --> |Alacritty/WezTerm/etc| Native["Native OS Window"]
    Emulator --> |xterm.js| Playwright["Headless Browser"]
    Emulator --> |Xvfb/Sway/kwin| LinuxHeadless["Linux Headless Compositor"]

    Server --> |create_snapshot (png)| ScreenCapture["Sharp / osascript / grim / Playwright"]
```

## System Requirements & Installation

`mcp-tuikit` relies on OS-level utilities to manage pseudo-terminals and capture screens.

### Core Dependency: `tmux`
`tmux` (v3.3a+, heavily recommended v3.5a+) is absolutely required on all platforms.

- **macOS:** `brew install tmux`
- **Linux:** `sudo apt install tmux` or `sudo dnf install tmux`
- **Windows:** `winget install arndawg.tmux-windows` (Do *not* use MSYS2 or WSL tmux if running natively).

### Platform-Specific Dependencies
- **macOS:** Uses built-in tools (`osascript`, `screencapture`). No extra dependencies needed.
- **Linux (Headless Native):** Requires a virtual compositor (`Xvfb` for X11, `sway` or `kwin` for Wayland). 
- **Windows:** Uses native standard process APIs (`cmd`, `powershell`).

## Known Issues & Limitations

Please see the [Troubleshooting Documentation](https://dragoscirjan.github.io/mcp-tuikit/possible-problems/) for full details. Notable limits include:

- **No Native Headless Mode on Windows/macOS:** Spawning a native terminal (like Alacritty) on Mac/Windows *will* open a physical window on your screen. True headless native rendering requires Linux (`Xvfb`/`Sway`/`kwin`). For invisible execution on Mac/Windows, you must use the `xterm.js` backend (via Playwright).
- **WezTerm + Sway:** WezTerm snapshots result in a black screen under headless Sway because it strictly requires hardware-accelerated GPU contexts (Vulkan/OpenGL).
- **macOS Snapshot Flakiness:** Timing-based macOS screenshots (using `CGWindowList`) can be flaky under heavy CPU load, sometimes capturing blank frames.
- **Tmux dependency:** All terminal operations are wrapped in `tmux` to guarantee stable pseudo-terminal (PTY) allocation and reliable ANSI text extraction.
- **No Mouse Support:** Currently, there is no mouse interaction support. Operating a terminal purely via standard keystrokes is required. Headed mode mouse automation presents significant technical challenges across multiple OS environments.
- **No Video Recording:** The toolkit currently only captures static text and PNG snapshots. Video recording of terminal sessions is planned for a future release.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for architectural guidelines, strict formatting/linting rules, and the PR process. Test-driven development is enforced via `vitest`.

## License

MIT
