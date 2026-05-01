# mcp-tuikit

**mcp-tuikit** is a powerful [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that enables AI agents to orchestrate, interact with, and monitor Text User Interfaces (TUIs) and headless terminal applications.

**🚀 Fully Cross-OS Compatible**  
Designed from the ground up to run seamlessly on **macOS**, **Linux**, and **Windows**. It bridges the gap between LLMs and native terminal environments, allowing agents to "see" (via PNGs and text) and "type" (via keystrokes) across any operating system.

## What Does It Do?

- **Spawn & Orchestrate:** Launch complex terminal applications (`nvim`, `htop`, `git`, or standard shells) using backends like `tmux`, `xterm.js`, or native emulators (Alacritty, WezTerm, iTerm2, etc.).
- **Capture State:** Take accurate textual representations and pixel-perfect visual PNG screenshots of running terminal apps.
- **Headless Execution:** Run terminal sessions invisibly in CI environments (via `Xvfb`, `Sway`, or `kwin` on Linux, or `xterm.js` everywhere) without interrupting the user's workflow.
- **Flow Engine:** Execute pre-defined, step-by-step TUI interaction scripts (YAML-based) for testing or autonomous agent tasks.

## Why mcp-tuikit?

Traditionally, giving an AI agent access to a terminal means piping raw `stdout`/`stderr`. This fails spectacularly for curses-based applications (like `vim` or `fzf`) that rely on complex ANSI escape sequences and screen redrawing.

`mcp-tuikit` solves this by running an actual PTY (pseudo-terminal) backed by `tmux` and rendering it to the agent either as a clean text grid or a visual screenshot. The agent sees exactly what a human would see.

---

## Next Steps

- **[Installation & Dependencies](getting-started/installation.md)**: Learn how to set up `mcp-tuikit` on your OS.
- **[Setup with LLMs](getting-started/llm-setup.md)**: Connect the server to Claude Desktop, Cursor, or other agents.
- **[Troubleshooting & Known Issues](possible-problems.md)**: Check platform limitations and edge cases.
