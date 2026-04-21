# Guide Overview

This guide walks you through the core concepts of `mcp-tuikit` and how to start building AI-powered TUI applications.

## Core Concepts

1. **Sessions:** Every interaction begins by creating a `tmux` session via `create_session`. This ensures isolated, reproducible environments for terminal apps to run.
2. **Backends:** The terminal emulator that runs the session. By default, `mcp-tuikit` supports cross-platform terminal backends like `xterm.js` or native apps like `Ghostty`, `Alacritty`, or `Kitty`.
3. **Snapshots:** Instead of raw stdout/stderr, `mcp-tuikit` captures precisely rendered snapshots of the terminal UI (both text and PNG images) so LLMs can "see" what a human sees.
4. **Flows:** Declarative YAML files that define a sequence of terminal inputs and expected outputs, perfect for CI/CD or complex LLM tool executions (`run_flow`).
