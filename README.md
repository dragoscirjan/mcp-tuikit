# mcp-tuikit

An MCP (Model Context Protocol) server designed for Text User Interface (TUI) and headless terminal interactions.

`mcp-tuikit` allows LLM agents to spawn, interact with, and monitor sophisticated terminal applications (such as `nvim`, `btop`, and standard shells) cross-platform. It provides robust headless testing, execution flows, and both text and visual (PNG) snapshotting of terminal states.

## Overview

The toolkit is structured as a modular `pnpm` monorepo to separate core server logic from terminal drivers, flow engines, and snapshot utilities.

### Key Capabilities

- **Terminal Orchestration:** Launch interactive, complex terminal sessions utilizing backends like `tmux`, `xterm.js`, and Playwright.
- **Headless Snapshots:** Capture accurate textual screen state and visual PNG screenshots of running TUI applications (even in headless CI environments like `Xvfb` or `Sway`).
- **Flow Execution:** Execute pre-defined flows and scripts against terminal instances for integration testing or autonomous agent tasks.
- **Cross-Platform:** Built to support macOS, Linux, and Windows (leveraging native `tmux` environments via `mise` and package managers).

## Project Structure

- `src/`: The core MCP server implementation.
- `packages/`: Modular workspace components:
  - `flow-engine`: Executes step-by-step TUI interactions.
  - `terminals`: Integrates various terminal emulators (e.g., Alacritty, WezTerm, Ghostty, Kitty, xterm.js).
  - `tmux`: Headless PTY and session management via `tmux`.
  - `snapshot`: Utilities for capturing text and visual representations of a terminal.
  - `linux-utils`: Linux-specific environment handlers (e.g., `Xvfb`, `Sway`).
  - `spawn`: Process execution wrappers.
  - `test`: Shared test harnesses and helpers.
- `test/`: Integration and End-to-End (E2E) tests.

## Development & Setup

This repository uses [mise](https://mise.jdx.dev/) to strictly manage toolchains (Node.js, Python, C++, Rust, etc.). You must use the provided `.mise.toml` template to guarantee environment parity.

### Prerequisites

1. Install `mise`.
2. Install `tmux` (v3.5a+ is recommended).

### Commands

All common development tasks are abstracted via `.mise.toml`:

```bash
# 1. Install toolchains and dependencies
mise install
pnpm install

# 2. Build all workspace packages
mise run build

# 3. Run unit tests
mise run test

# 4. Run integration tests
mise run test:integration

# 5. Lint the project
mise run lint
```

## Testing Philosophy

Test-Driven Development (TDD) is enforced using `vitest`. The test suite ensures cross-platform stability by spinning up true headless terminal sessions (via `Sway`, `Xvfb`, or Playwright) and validating the exact visual and textual outputs (`sharp` is used to detect blank or black renders).

For known environmental quirks (e.g., rendering issues in headless Wayland), see [KNOWN_ISSUES.md](./KNOWN_ISSUES.md).

## Contributing

Please review [CONTRIBUTING.md](./CONTRIBUTING.md) for architectural guidelines, strict formatting/linting rules, and the pull request process. All contributions must be accompanied by relevant test suites.
