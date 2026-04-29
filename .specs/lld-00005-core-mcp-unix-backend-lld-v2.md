---
id: "00005"
type: lld
title: "Core MCP & Unix Backend LLD"
version: 2
status: approved
parent: "00001"
opencode-agent: lead-engineer
---

# Core MCP & Unix Backend LLD (v2 — Implemented State)

## 1. Overview

This is a reconciliation update to LLD-00005. Version 1 described the planned design. This version documents what is actually implemented, identifies gaps, and lists remaining work as discrete tasks.

The system is a pnpm monorepo MCP server that manages terminal sessions via tmux, exposes them as MCP tools/resources, and supports flow-based automation with snapshot capture. The macOS platform is fully functional. Linux and Windows are partially supported (text snapshots only; PNG capture is missing).

## 2. Directory Structure

```text
/
+-- package.json              Root package -- private monorepo, bin: mcp-tuikit
+-- pnpm-workspace.yaml       Workspaces: packages/*, src
+-- tsconfig.json
+-- eslint.config.mjs
+-- vitest.config.ts
+-- .mise.toml
+-- .husky/                   Pre-commit hooks (lint-staged)
+-- .jscpd.json               Copy-paste detection config
+--
+-- packages/
|   +-- core/src/
|   |   +-- TerminalBackend.ts    Interface contract
|   |   +-- errors.ts             TimeoutError, TmuxExecutionError
|   |   +-- utils.ts              parseResolutions helper
|   |   +-- index.ts              Barrel re-export
|   |   +-- *.spec.ts             Unit tests for errors and utils
|   |
|   +-- tmux/src/
|   |   +-- TmuxBackend.ts        TerminalBackend implementation via tmux subprocess
|   |   +-- TmuxBackend.spec.ts   Unit tests
|   |   +-- index.ts              Barrel re-export
|   |
|   +-- flow-engine/src/
|       +-- schema.ts             YAML flow definition (Zod), parseFlow/parseFlowFromString
|       +-- runner.ts             FlowRunner class -- orchestrates spawn/type/send_key/sleep/snapshot/wait_for
|       +-- config.ts             getBackendConfig -- selects terminal app per platform/env
|       +-- spawner.ts            spawnTerminal/closeTerminal -- iTerm2, WezTerm, Alacritty, Ghostty
|       +-- snapshotters/
|       |   +-- macos.ts          captureMacOsWindow (AppleScript + CGWindowList + screencapture)
|       +-- backends/
|       |   +-- playwright.ts     capturePlaywrightSnapshot (headless xterm.js rendering via Chromium)
|       +-- *.spec.ts             Unit tests for schema, runner, config, spawner, macos snapshotter
|
+-- src/
|   +-- index.ts              MCP server entrypoint (~402 lines, all tools + resources + lifecycle)
|   +-- server.spec.ts        Server-level tests
|
+-- test/                     Integration/e2e tests
```

## 3. Dual-Session Architecture

This is the most critical implementation detail and was not described in v1.

Every MCP session creates TWO tmux layers:

1. **Outer session** (prefix `mcp-XXXX`): Created by TmuxBackend.createSession. This is a wrapper whose sole purpose is to launch the inner session. It may exit immediately after creating the inner session.

2. **Inner session** (prefix `tuikit_XXXX`): Created inside the outer session command. This is where the user's actual command runs. All reads (capture-pane, waitForText) MUST target this session.

The create_session tool in the MCP server issues a compound command to the outer session:
`env TMUX= tmux new-session -s tuikit_XXX -x COLS -y ROWS -d 'USER_CMD' && env TMUX= tmux attach -t tuikit_XXX`

The `env TMUX=` prefix unsets the TMUX variable to allow nested tmux session creation, which tmux normally blocks.

The session registry (in-memory Map plus persisted JSON at `~/.mcp-tuikit/sessions.json`) stores both the outer session ID and the inner tmuxSession name, so that tools like wait_for_text and create_snapshot can correctly target the inner session.

The FlowRunner in the flow-engine package follows the same dual-session pattern, storing the innerSessionName separately and targeting it for all capture and wait operations.

## 4. Core Components (Status)

### 4.1 packages/spawn — DONE

- **TerminalBackend interface**: Defines createSession, closeSession, sendKeys, waitForText, getScreenPlaintext, getScreenJson, getSessionState. Fully implemented and tested.
- **errors.ts**: TimeoutError and TmuxExecutionError. Fully implemented and tested.
- **utils.ts**: parseResolutions helper (converts pixel strings like "1024x768" to cols/rows using 10x20 heuristic). Fully implemented and tested.

### 4.2 packages/tmux — DONE

- **TmuxBackend**: Implements all TerminalBackend methods via tmux subprocess calls (exec/promisify pattern).
  - createSession: Generates `mcp-XXXX` session name via nanoid, runs `tmux new-session -d`. Optionally opens Terminal.app if TUIKIT_HEADED=1 (legacy path, not used by MCP server).
  - closeSession: `tmux kill-session -t ID`
  - sendKeys: `tmux send-keys -t ID "keys"`
  - getScreenPlaintext: `tmux capture-pane -p -t ID`, trims trailing blank lines, supports maxLines
  - getScreenJson: Returns a structured object with content, cursor (hardcoded 0,0), and dimensions (hardcoded 80x24)
  - getSessionState: `tmux display-message -p -t ID '#{session_id}'`, returns empty string if session is gone
  - waitForText: Polling loop at 500ms intervals with regex matching, throws TimeoutError on expiry
- Tested via TmuxBackend.spec.ts.

### 4.3 packages/flow-engine — DONE

- **schema.ts**: Zod-validated YAML flow format. Actions: spawn, wait_for, type, send_key, sleep, snapshot. Parses from file path or inline string.
- **runner.ts (FlowRunner)**: Stateful runner that creates a session, executes steps sequentially, collects Artifact results, and cleans up both inner and outer sessions. Supports rolling ANSI buffer for backends that expose onData streaming.
- **config.ts (getBackendConfig)**: Returns terminal app name based on platform: iterm2 (macOS), gnome-terminal (Linux), windows-terminal (Win32), or TUIKIT_TERMINAL env override. Returns "playwright" when CI=true.
- **spawner.ts**: spawnTerminal supports four macOS terminals (iTerm2 via AppleScript, WezTerm via direct process, Alacritty via direct process with temp TOML config, Ghostty via `open -na` with PID diffing). closeTerminal does SIGTERM/SIGKILL for PID-based spawns, AppleScript window close for iTerm2.
- **snapshotters/macos.ts (captureMacOsWindow)**: Gets window ID via AppleScript (iTerm2) or CGWindowList Swift snippet (WezTerm/Alacritty/Ghostty), activates the app, runs `screencapture -x -o -l WINDOW_ID` with retry logic.
- **backends/playwright.ts (capturePlaywrightSnapshot)**: Headless Chromium renders ANSI data in xterm.js, screenshots the viewport element. Used when backendConfig is "playwright" (CI environments).

### 4.4 src/index.ts (MCP Server) — DONE (with gaps)

**Session lifecycle:**
- In-memory Map of SessionEntry objects (id, command, cols, rows, tmuxSession, spawnResult)
- Persisted to `~/.mcp-tuikit/sessions.json` on every mutation
- On startup: reads persisted state, kills orphaned tmux sessions and terminal windows, clears state file
- On SIGINT/SIGTERM/uncaughtException: best-effort cleanup of all sessions, then exit

**Registered MCP tools (7 total):**

| Tool | Status | Notes |
|------|--------|-------|
| create_session | DONE | Creates outer + inner tmux sessions, spawns terminal window, returns sessionId |
| close_session | DONE | Closes terminal window, kills outer tmux session, removes from registry |
| create_snapshot | DONE | Supports txt (tmux capture-pane on inner session), png (macOS only via captureMacOsWindow), or both |
| send_keys | DONE | Sends to outer session via TmuxBackend. Supports submit flag (appends newline) |
| wait_for_text | DONE | Polls inner tuikit_XXX session via TmuxBackend.waitForText |
| run_flow | DONE | Delegates to FlowRunner with inline YAML or file path |
| list_sessions | DONE | Iterates registry, checks liveness via `tmux has-session -t INNER` |

**Registered MCP resources (1 of 2 planned):**

| Resource | Status | Notes |
|----------|--------|-------|
| terminal://session/{id}/screen.txt?maxLines={limit} | DONE | Reads via TmuxBackend.getScreenPlaintext |
| terminal://session/{id}/screen.json | TODO | Not yet exposed. TmuxBackend.getScreenJson exists but returns hardcoded cursor/dimensions |

## 5. Identified Gaps

### 5.1 PNG snapshot on Linux/Windows — DEFERRED

The create_snapshot tool and FlowRunner snapshot action both gate PNG capture behind `process.platform === 'darwin'`. Non-macOS returns an error. This requires a separate LLD covering:
- Linux: xdotool + import (ImageMagick) or scrot, or headless Playwright path
- Windows: ConPTY-based approach or PowerShell screenshot utilities
- The Playwright-based headless renderer (backends/playwright.ts) already exists and could serve as a cross-platform fallback for PNG snapshots, but is currently only wired into FlowRunner (not into the create_snapshot MCP tool)

### 5.2 screen.json resource not exposed

TmuxBackend.getScreenJson returns a structured object but the MCP server only registers the plaintext resource. The JSON resource should expose content, cursor position, and terminal dimensions. Note: cursor and dimensions are currently hardcoded in TmuxBackend.getScreenJson (cursor 0,0, dimensions 80x24) and would need to be derived from actual tmux state to be useful.

### 5.3 resize_terminal tool not implemented

The v1 LLD listed resize_terminal as a planned tool. It is not implemented anywhere. The TmuxBackend does not have a resize method, and the TerminalBackend interface does not include one. Implementation would involve `tmux resize-window` and potentially resizing the terminal window itself via AppleScript/platform-specific means.

### 5.4 send_keys targets outer session

The send_keys tool currently delegates to `backend.sendKeys(session_id, payload)` where session_id is the outer `mcp-XXXX` session. In contrast, wait_for_text correctly targets `entry.tmuxSession` (the inner `tuikit_XXX` session). If the outer session has already exited (which can happen since it is just a launcher), send_keys may fail silently or error. This should be reconciled to target the inner session consistently.

### 5.5 getScreenJson hardcoded values

TmuxBackend.getScreenJson returns `cursor: { x: 0, y: 0 }` and `dimensions: { cols: 80, rows: 24 }` regardless of actual state. Cursor position can be obtained via `tmux display-message -p -t ID '#{cursor_x} #{cursor_y}'`. Dimensions can be obtained via `tmux display-message -p -t ID '#{window_width} #{window_height}'`.

### 5.6 Linux/Windows terminal spawner backends missing

spawner.ts only implements macOS terminal apps (iTerm2, WezTerm, Alacritty, Ghostty). The config.ts returns gnome-terminal and windows-terminal for Linux and Win32 respectively, but spawnTerminal throws "Unknown terminal backend" for those values.

## 6. Implementation Tasks (Remaining)

These are ordered by dependency. Each task should be 1-3 files.

### Task 1: Fix send_keys to target inner session
- File: `src/index.ts`
- Change the send_keys tool handler to use `entry.tmuxSession` (inner session) instead of `session_id` (outer session), matching the pattern used by wait_for_text and create_snapshot
- Risk: Low. Straightforward change with clear precedent in adjacent tools.

### Task 2: Expose screen.json MCP resource
- File: `src/index.ts`
- Register a new resource at `terminal://session/{id}/screen.json`
- Delegates to TmuxBackend.getScreenJson targeting the inner session
- Prerequisite: Task 3 (to return accurate data)

### Task 3: Fix getScreenJson to return real cursor and dimensions
- File: `packages/tmux/src/TmuxBackend.ts`
- Replace hardcoded cursor and dimensions with actual tmux queries
- Cursor: `tmux display-message -p -t ID '#{cursor_x} #{cursor_y}'`
- Dimensions: `tmux display-message -p -t ID '#{window_width} #{window_height}'`
- Add/update tests in TmuxBackend.spec.ts

### Task 4: Add resize method to TerminalBackend and TmuxBackend
- Files: `packages/spawn/src/TerminalBackend.ts`, `packages/tmux/src/TmuxBackend.ts`
- Add `resizeSession(sessionId: string, cols: number, rows: number): Promise<void>` to the interface
- Implement via `tmux resize-window -t ID -x COLS -y ROWS`
- Add tests

### Task 5: Add resize_terminal MCP tool
- File: `src/index.ts`
- Register resize_terminal tool that calls backend.resizeSession on the inner session
- Optionally resize the terminal window via platform-specific means (AppleScript for iTerm2, config reload for Alacritty, etc.)
- Depends on: Task 4

### Task 6: Wire Playwright fallback into create_snapshot for non-macOS PNG
- Files: `src/index.ts`
- When `process.platform !== 'darwin'` and format is png/both, use capturePlaywrightSnapshot with content from tmux capture-pane instead of returning an error
- This provides a functional (though not pixel-perfect) PNG path on all platforms
- Depends on: flow-engine's playwright backend being importable from the MCP server

### Task 7: Add Linux/Windows spawner backends
- File: `packages/flow-engine/src/spawner.ts`
- Implement gnome-terminal, xterm, and windows-terminal cases in spawnTerminal
- Implement corresponding closeTerminal cases
- This is separate from the PNG snapshot gap (Task 6) and enables headed mode on those platforms

## 7. Edge Cases and Risks

- **Orphaned inner sessions**: If the MCP server crashes between creating the inner tuikit session and persisting state, the inner session leaks. Mitigation: the startup cleanup reads persisted state, but only for sessions that were successfully registered. A secondary mitigation could list all `tuikit_*` tmux sessions on startup and kill unregistered ones.
- **tmux version differences**: The codebase assumes tmux features like `-x`/`-y` on new-session (tmux 2.6+) and display-message format strings. Minimum tmux version should be documented.
- **Shell escaping**: The create_session command embeds the user command in single quotes within a shell string. Commands containing single quotes will break. The command should be escaped or passed via a temporary script file.
- **Concurrent session mutations**: persistSessions writes the entire sessions Map on every mutation. Concurrent tool calls could race and lose updates. A write-lock or atomic-write pattern would be safer.
- **AppleScript permissions**: macOS requires Accessibility and Automation permissions for osascript/screencapture. First-run failures should produce actionable error messages explaining which System Preferences pane to visit.

# Core MCP & Unix Backend LLD

