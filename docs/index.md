# mcp-tuikit

**Bridging Large Language Models and TUI Applications**

`mcp-tuikit` is a powerful Model Context Protocol (MCP) server that exposes a suite of tools for LLMs (like Claude, Cursor, and ChatGPT) to create, manage, and test Terminal User Interface (TUI) applications.

Instead of your LLM struggling to guess what a TUI looks like or how it responds, `mcp-tuikit` allows the LLM to spawn real terminal sessions (via `tmux`), inject keystrokes, wait for UI updates, and receive precise text and image snapshots of the terminal state.

## Why mcp-tuikit?

- **Real TUI Development for LLMs:** Let your AI assistant "see" the terminal output in real-time.
- **Cross-Platform Native Backends:** Supports running terminals via Alacritty, Ghostty, WezTerm, Kitty, xterm.js, and more across macOS and Linux.
- **Reproducible Flows:** Define complex multi-step terminal interactions using simple YAML flows (`run_flow`).
- **Headless & CI Friendly:** Ideal for integration tests and visual regression testing.

## Quick Start

### Installation

Ensure you have `tmux` installed on your system.
Then, you can start the MCP server directly via `npx` or `pnpx`:

```bash
npx @dragoscirjan/mcp-tuikit
```

### Integrating with Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "tuikit": {
      "command": "npx",
      "args": ["-y", "@dragoscirjan/mcp-tuikit"]
    }
  }
}
```

## Next Steps

- [Setup & Configuration](guide/setup.md)
- [How to Prompt LLMs for TUI Development](guide/llm-integration.md)
- [View all exposed MCP Tools](reference/tools.md)
