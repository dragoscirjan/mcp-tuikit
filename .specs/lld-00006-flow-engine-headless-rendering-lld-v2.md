---
id: "00006"
type: lld
title: "Flow Engine & Headless Rendering LLD"
version: 2
status: draft
parent: "00002"
opencode-agent: lead-engineer
---

# Flow Engine & Headless Rendering LLD

## 1. Overview
This Low-Level Design defines the structure for the Flow Engine and Headless Rendering, adhering to HLD #00002. It clarifies the usage of headless terminal emulation and robust asynchronous event handling.

## 2. Dependencies
- **`js-yaml`**: For parsing flow scripts.
- **`zod`**: For strict schema validation.
- **`canvas`**: Native renderer backing for drawing text and shapes.
- **`@xterm/headless`**: Mandatory for terminal state management and ANSI parsing.
- **`fs-extra`**: For file operations.

## 3. Package Structure
Create a workspace package `packages/flow-engine`. It will depend on `@mcp-tuikit/core` which provides the `TerminalBackend` interface.

## 4. Components

### 4.1 Schema Definition
Define `FlowSchema` using Zod to validate actions: `spawn`, `wait_for`, `type`, `send_key`, `snapshot`.

### 4.2 Flow Runner
Define `FlowRunner` class accepting a `TerminalBackend`.
The `run` method orchestrates the asynchronous execution of steps.
For the `wait_for` action, attach a listener to `backend.onData` wrapped in a Promise.
Maintain a rolling string buffer of incoming data to ensure target text split across multiple payloads is correctly matched.
Ensure listeners are explicitly removed upon match or timeout to prevent memory leaks and keep the Node event loop unblocked.

### 4.3 Headless Renderer
Define `HeadlessRenderer` class.
Instantiate `@xterm/headless` to process raw ANSI strings and maintain the terminal grid state.
Iterate through the terminal buffer cells and draw them using the `canvas` API.
Register and load custom Nerd Fonts into the canvas context prior to terminal initialization to ensure correct cell dimension calculations.
Export the final state to PNG, TXT, and JSON artifacts.

### 4.4 MCP Tool Integration
Expose a `run_flow` tool in the main MCP server (`src/index.ts`).
Parse the target file, invoke `FlowRunner`, generate artifacts, and return the output paths.

## 5. Tasks
1. Initialize `packages/flow-engine` with necessary dependencies.
2. Implement YAML schema parsing and validation.
3. Implement `HeadlessRenderer` mapping `@xterm/headless` buffer cells to canvas operations.
4. Implement `FlowRunner` focusing on the rolling buffer and memory-safe `wait_for` listener.
5. Integrate the `run_flow` tool into the primary MCP server.
6. Write unit tests for the chunked data buffering and headless rendering output.

