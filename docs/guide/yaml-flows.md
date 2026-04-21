# YAML Flow Syntax

`run_flow` is an MCP tool that allows you (or your LLM) to execute a predefined sequence of terminal inputs and assertions in an isolated, reproducible environment. This prevents the LLM from getting "stuck" due to latency in a step-by-step execution.

## Flow Structure

A TUI flow is written in YAML. The top-level schema contains `version`, `description`, and a `steps` array.

### Basic Example: Running `btop`

```yaml
version: "1.0"
description: "Open btop, wait for it to render, take a snapshot"
steps:
  - action: spawn
    cmd: btop

  # Wait for btop to fully render (CPU meter appears)
  - action: wait_for
    pattern: "CPU"
    timeoutMs: 25000

  - action: sleep
    ms: 1000

  - action: snapshot
    format: txt
    outputPath: "snapshots/btop-{hash}.txt"
    intent: "btop default view with CPU meter"

  - action: snapshot
    format: png
    outputPath: "snapshots/btop-{hash}.png"
    intent: "btop default view screenshot"

  - action: sleep
    ms: 2000
```

## Available Actions

Each step is defined by its `action` parameter.

### `spawn`

Spawns the initial process inside the terminal session. This is typically the first step.

- `cmd`: The command string to execute (e.g. `btop`, `nvim`, `htop`).

### `wait_for`

Blocks the flow until a specific text pattern is rendered on the terminal screen.

- `pattern`: The string or regular expression to match.
- `timeoutMs`: How long to wait before failing the flow (in milliseconds).

### `sleep`

Pauses execution for a fixed duration.

- `ms`: Delay in milliseconds.

### `send_keys`

Injects keystrokes into the active terminal session.

- `keys`: The string of characters to send (e.g., `^C` for Ctrl+C, or simply typing text).

### `snapshot`

Captures the current state of the terminal.

- `format`: `txt` for ANSI-rendered text representation, `png` for an image representation.
- `outputPath`: The file path to save the snapshot. You can use `{hash}` as a variable to ensure a unique filename.
- `intent`: A human-readable description attached to the snapshot.

## How to execute a flow via the MCP Server

You can tell your LLM to execute this file using the `mcp-tuikit-dev_run_flow` tool, passing either the absolute path (`yaml_path`) or the inline YAML string (`yaml_string`). The server handles spinning up an isolated `tmux` session, parsing the YAML, running the actions, and closing the session cleanly when finished.
