---
id: "00005"
type: lld
title: "Core MCP & Unix Backend LLD"
version: 1
status: superseded
parent: "00001"
opencode-agent: lead-engineer
---

# Core MCP & Unix Backend LLD

## 1. Overview

This LLD details the implementation of Story #10 (Core MCP & Unix Backend), fulfilling HLD `00001` (v2). It sets up the TypeScript pnpm monorepo, the `@templ-project` toolchain, the `TerminalBackend` contract, the `tmux` implementation, and the actual MCP server.

## 2. Directory Structure & Workspaces

Following `CONTRIBUTING.md`, the repository will be structured as a `pnpm` workspace:

```text
/
├── .mise.toml                # Toolchain config (Node.js, pnpm)
├── Taskfile.yml              # Centralized task runner (build, lint, test)
├── package.json              # Monorepo root (dev dependencies: @templ-project/*, vitest, typescript)
├── pnpm-workspace.yaml       # Defines packages/* and src/
├── tsconfig.json             # Root typescript config
├── eslint.config.mjs         # Root ESLint config
├── vitest.config.js          # Root Vitest config
├── packages/
│   ├── core/                 # TerminalBackend interface & custom error classes
│   └── tmux/                 # Tmux implementation of TerminalBackend
└── src/                      # Core MCP Server (CLI entrypoint, tools, resources)
```

## 3. Core Components

### 3.1 `packages/spawn`

- **`TerminalBackend.ts`**: The abstract interface containing `createSession`, `closeSession`, `sendKeys`, `waitForText`, `getScreenPlaintext`, `getScreenJson`, and `getSessionState`.
- **`errors.ts`**: Specific error types `TimeoutError` and `TmuxExecutionError`.

### 3.2 `packages/tmux`

- **`TmuxBackend.ts`**: Implements `TerminalBackend`.
  - Spawns `tmux` sessions via `child_process.spawn`.
  - Maintains long-lived sessions prefixed with `mcp-`.
  - Uses `tmux capture-pane` for state polling.
  - Implements a polling loop for `waitForText` as a reliable fallback/baseline before stream integration.
  - Lifecycle: ensures `SIGINT`/`SIGTERM` handlers are registered to reap child sessions.

### 3.3 `src/` (MCP Server)

- **`index.ts`**: The main entrypoint using `@modelcontextprotocol/sdk`. Sets up the stdio transport and graceful shutdown handlers to kill all `tmux` sessions on exit.
- **`tools.ts`**: Exposes the MCP tools: `create_session`, `send_keys`, `wait_for_text`, `resize_terminal`, `close_session`, `list_sessions`.
- **`resources.ts`**: Resolves `terminal://session/{id}/screen.txt` and `terminal://session/{id}/screen.json`.

## 4. Execution Order (Tasks)

1. **Initialize Project & Toolchain**:
   - Create `.mise.toml` (Node.js + pnpm), `package.json` (workspaces setup).
   - Install and configure `@templ-project/eslint`, `@templ-project/prettier`, `@templ-project/tsconfig`, `@templ-project/vitest`.
   - Setup `Taskfile.yml`.
2. **Implement Core Package (`packages/spawn`)**:
   - Write tests and implementation for `TerminalBackend` interface (types) and error classes.
3. **Implement Tmux Package (`packages/tmux`)**:
   - Write tests using `vitest` for `TmuxBackend`.
   - Implement session creation, cleanup, resize, and state tracking.
   - Implement `waitForText` using an asynchronous polling strategy on `capture-pane`.
4. **Implement MCP Server (`src/`)**:
   - Set up `@modelcontextprotocol/sdk`.
   - Wire tools and resources to the `TmuxBackend`.
   - Ensure proper process-level cleanup (listening to `exit`, `SIGTERM`, etc.).
5. **Final Integration & Verification**:
   - Verify `task test`, `task lint`, `task build` run successfully.
   - Test full flow locally (e.g. creating a session and capturing screen).
