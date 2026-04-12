---
id: "00006"
type: lld
title: "Flow Engine Multi-Backend Terminal Rendering LLD"
version: 4
status: approved
parent: "00002"
opencode-agent: lead-engineer
---

# LLD 00006: Flow Engine Multi-Backend Terminal Rendering (v4)

## Purpose

This revision reconciles the v3 specification with the actual implemented state of the flow engine. It documents the working macOS path, the partially-complete Playwright path, and defines remaining work for Linux and Windows platforms.

## Implementation Status Summary

| Component | Status |
|---|---|
| YAML flow schema and parser | DONE |
| Backend configuration and selection | DONE |
| FlowRunner sequential execution | DONE |
| iTerm2 spawner (macOS) | DONE |
| WezTerm spawner (macOS) | DONE |
| Alacritty spawner (macOS) | DONE |
| Ghostty spawner (macOS) | DONE |
| macOS window snapshotter | DONE |
| Playwright headless ANSI renderer | PARTIALLY DONE |
| GNOME Terminal spawner (Linux) | NOT STARTED |
| Windows Terminal spawner (Windows) | NOT STARTED |
| Linux window snapshotter | NOT STARTED |
| Windows window snapshotter | NOT STARTED |
| Runner png path for Linux/Windows | NOT STARTED |

---

## 1. Implemented Architecture

### 1.1 Flow Schema (schema.ts) — DONE

Defines a YAML-driven flow with six action types: spawn, wait_for, type, send_key, sleep, and snapshot. Validated through Zod discriminated union. Supports both file-based parsing and inline string parsing. The snapshot action accepts a format (png or txt) and an outputPath with template variable support for hash uniqueness. An optional intent field carries semantic context for downstream consumers such as visual QA.

### 1.2 Backend Configuration (config.ts) — DONE

Reads the TUIKIT_TERMINAL environment variable for explicit override. In CI environments (process.env.CI is truthy), always returns playwright. Platform defaults: darwin maps to iterm2, linux to gnome-terminal, win32 to windows-terminal, all others to xterm. No fallback chain — the system errors on unsupported backends rather than silently degrading.

### 1.3 Flow Runner (runner.ts) — DONE (macOS and Playwright paths)

FlowRunner accepts a TerminalBackend (from @mcp-tuikit/core) and optional cols/rows dimensions (default 80x30). Executes flow steps sequentially.

**Spawn step — dual path:**

- Non-playwright path: creates an inner tmux session named tuikit_XXXXXXXX with the specified command, then calls spawnTerminal to open a visible terminal window attached to that tmux session. The sessionId is pointed at the inner tmux session so all subsequent MCP operations (sendKeys, waitForText) target the live pane directly.
- Playwright path: delegates session creation entirely to the TerminalBackend.createSession method. No tmux intermediary or visible terminal window.

**Data streaming:** After spawn, the runner attaches an onData listener (via a loosely-typed cast to the backend) that feeds a rolling buffer capped at 50KB. This buffer powers the event-driven wait_for mechanism.

**Wait_for step:** Checks the rolling buffer for a literal string match or regex match. If the backend exposes onData, uses event-driven notification; otherwise falls back to the backend's own waitForText polling. Times out with a descriptive error.

**Snapshot txt step:** Runs tmux capture-pane against the inner session name, writes raw text output to the resolved path. Works on all platforms where tmux is available.

**Snapshot png step — platform dispatch:**

- Playwright backend: calls capturePlaywrightSnapshot with the rolling buffer content.
- macOS (process.platform is darwin): calls captureMacOsWindow with the backend config name as the app identifier.
- Linux and Windows: currently falls through silently — no error is raised and no file is produced. This is a gap that must be addressed.

**Cleanup:** Disposes the data listener, closes both the outer and inner tmux sessions (best-effort), and calls closeTerminal to kill the terminal window process.

### 1.4 Terminal Spawners (spawner.ts) — DONE (macOS only)

All spawners return a SpawnResult containing either a windowHandle (for AppleScript-controlled terminals) or a pid (for directly-spawned processes), plus an optional tmpConfig path for temp file cleanup.

**iTerm2:** Uses AppleScript to create a new window, set its bounds to pixel dimensions derived from cols/rows (cols times 10 plus 50 by rows times 20 plus 50), then writes an exec tmux attach command to the session. Returns the AppleScript window ID as windowHandle for later close-by-ID.

**WezTerm:** Calls the wezterm-gui binary directly via spawnDirectProcess with --config initial_cols and initial_rows flags. Attaches to the tmux session via the start subcommand. Binary path overridable via WEZTERM_BIN env var. Returns PID for cleanup.

**Alacritty:** Writes a temporary TOML config file specifying window.dimensions (columns and lines) and terminal.shell (program tmux, args attach -t session). Launches the Alacritty binary with --config-file pointing to the temp file. Binary path overridable via ALACRITTY_BIN env var. Returns PID and tmpConfig path; closeTerminal removes the config after kill.

**Ghostty:** Launched via macOS open -na Ghostty.app with --args passing --class (a unique UUID to force a new window group), --window-width, --window-height, and -e tmux attach. Uses a PID-diff strategy: snapshots all ghostty PIDs before launch, waits for startup, then diffs to find the new PID.

**closeTerminal:** For PID-based results, sends SIGTERM, waits 500ms, then SIGKILL as fallback, then removes tmpConfig. For AppleScript-based results (iTerm2), uses osascript to close the window by ID.

### 1.5 macOS Snapshotter (snapshotters/macos.ts) — DONE

captureMacOsWindow accepts an app name, output path, and configurable timeout/poll interval.

**Window ID acquisition — two strategies:**

- AppleScript path: used for iTerm2 and any app with an AppleScript dictionary. Activates the app and queries the window ID of window 1.
- CGWindowList path: used for WezTerm, Ghostty, and Alacritty which lack usable AppleScript window-ID APIs. Executes an inline Swift script that iterates CGWindowListCopyWindowInfo, filters by owner name (case-insensitive), and skips off-screen or zero-dimension windows.

**Capture flow:** Polls for the window ID with a configurable interval up to a 30-second timeout. Activates the target app via open -a to ensure it has a backing store. Waits 500ms for compositor rendering. Retries screencapture up to three times (with -x for silent, -o for no shadow, -l for window-by-ID).

### 1.6 Playwright Backend (backends/playwright.ts) — PARTIALLY DONE

capturePlaywrightSnapshot launches headless Chromium, creates a page with a 1920x1080 viewport, and injects inline HTML containing xterm.js. The ANSI data from the rolling buffer is base64-encoded and decoded client-side. After writing the data to the xterm.js terminal instance, waits 500ms for canvas rendering, then screenshots the .xterm-viewport element (falling back to the terminal container div).

**Known gap:** The xterm.js CSS and JS are loaded from unpkg CDN (https://unpkg.com/@xterm/xterm). This creates a network dependency that will fail in air-gapped CI environments or when the CDN is unavailable. The @xterm/headless package is already listed as a dependency in package.json but is not yet wired into this code path. The fix should serve xterm.js assets from the local node_modules or bundle them into the HTML.

---

## 2. Remaining Work

### Task R1: Fix Playwright CDN Dependency

**Scope:** backends/playwright.ts

**Problem:** xterm.js CSS and JS are fetched from unpkg at runtime. Breaks in offline CI.

**Approach:** Read the xterm.js and xterm.css files from the installed @xterm/xterm package in node_modules (the package is already a dependency). Inline them into the HTML template as embedded style and script tags, or serve them via a local file URL. Remove the CDN links entirely.

**Files touched:** backends/playwright.ts (1 file)

**Risk:** The @xterm/headless package (already in package.json) does not include the CSS or canvas renderer needed for visual screenshots. The full @xterm/xterm package must be retained or added as a dependency for its browser-facing assets.

### Task R2: Linux Spawner — GNOME Terminal

**Scope:** spawner.ts

**Problem:** The gnome-terminal case in the switch falls through to the default error branch.

**Approach:** Add a gnome-terminal case to spawnTerminal. GNOME Terminal supports a command-line invocation pattern: gnome-terminal -- tmux attach -t SESSION_NAME. Use --geometry=COLSxROWS to set initial dimensions. Spawn via execa detached similar to the Alacritty pattern. GNOME Terminal may also need a --wait flag to prevent the launcher process from exiting immediately (its behavior varies by version). Return PID for cleanup.

**Files touched:** spawner.ts (1 file)

**Edge cases:** On Wayland, gnome-terminal may not support --geometry. Detect XDG_SESSION_TYPE and warn if dimension control is unavailable. Some Linux distributions use gnome-terminal.wrapper instead of gnome-terminal directly.

### Task R3: Windows Spawner — Windows Terminal

**Scope:** spawner.ts

**Problem:** The windows-terminal case falls through to the default error branch.

**Approach:** Add a windows-terminal case. Windows Terminal can be invoked via wt.exe with profile and command arguments. The tmux attach pattern does not apply on Windows; instead, the spawn command should be passed directly as the shell command. Dimension control via --size COLS,ROWS (available in Windows Terminal 1.18 and later). Spawn via execa detached. Return PID for cleanup.

**Files touched:** spawner.ts (1 file)

**Edge cases:** tmux is not natively available on Windows. The runner.ts spawn step creates an inner tmux session; this entire pattern must be reconsidered for Windows. Options include: WSL-based tmux, ConPTY direct integration, or a Windows-specific spawn path in runner.ts that bypasses tmux entirely. This is a cross-cutting concern that may require changes to runner.ts as well.

**Dependencies:** This task depends on architectural decisions about the Windows session model (tmux-via-WSL versus native ConPTY). Recommend addressing HLD-00003 (Windows ConPTY Backend) first.

### Task R4: Linux Snapshotter

**Scope:** New file snapshotters/linux.ts; wire into runner.ts

**Problem:** runner.ts snapshot png path has no Linux handler — falls through silently.

**Approach:** Create snapshotters/linux.ts exporting a captureLinuxWindow function. Strategy depends on display server:

- X11 path: Use xdotool to find the window by name or PID (xdotool search --name PATTERN), activate it (xdotool windowactivate), then capture via import (ImageMagick) or scrot targeting the window ID.
- Wayland path: Wayland does not allow arbitrary window capture by design. Options include: gnome-screenshot --window (GNOME-specific), grim with slurp (wlroots compositors), or fall back to the Playwright headless renderer.

Wire captureLinuxWindow into runner.ts snapshot png step alongside the existing macOS and Playwright branches.

**Files touched:** snapshotters/linux.ts (new), runner.ts (add Linux branch), index.ts (export)

**Edge cases:** Missing tools (xdotool, scrot, import, grim) should produce a clear error message with installation instructions. Wayland compositors vary significantly; a capability-detection step is necessary. Permission denials under Wayland should fall back to the Playwright path with a warning.

### Task R5: Windows Snapshotter

**Scope:** New file snapshotters/windows.ts; wire into runner.ts

**Problem:** runner.ts snapshot png path has no Windows handler — falls through silently.

**Approach:** Create snapshotters/windows.ts exporting a captureWindowsWindow function. Use a Node.js native addon or a PowerShell script calling the Win32 PrintWindow API or BitBlt to capture a specific window by handle. Alternatively, invoke the built-in Snipping Tool CLI or nircmd (third-party but widely available) for window-targeted capture.

Wire captureWindowsWindow into runner.ts snapshot png step.

**Files touched:** snapshotters/windows.ts (new), runner.ts (add Windows branch), index.ts (export)

**Edge cases:** UAC elevation may block programmatic screenshot APIs. DPI scaling (100%, 125%, 150%, 200%) affects captured image dimensions — must normalize. Window handle acquisition varies between Windows Terminal (UWP) and traditional Win32 apps.

**Dependencies:** Depends on Task R3 (Windows Spawner) being resolved, since the snapshotter needs to know how to identify the target window.

### Task R6: Runner Silent Failure on Linux/Windows PNG

**Scope:** runner.ts

**Problem:** Lines 141-145 of runner.ts: the else-if chain for snapshot png only handles playwright and darwin. Linux and Windows silently produce no output and record an artifact pointing to a nonexistent file.

**Approach:** This task is a prerequisite guard that should be completed immediately, even before Tasks R4/R5. Add explicit error branches for Linux and Windows that throw an error stating the platform snapshotter is not yet implemented. This prevents silent data loss and makes test failures obvious.

Separately, once Tasks R4 and R5 are complete, replace these error branches with the actual snapshotter calls.

**Files touched:** runner.ts (1 file)

---

## 3. Task Dependency Order

The recommended implementation sequence, respecting dependencies:

1. **Task R6** — Runner silent failure guard (immediate; no dependencies; prevents data loss)
2. **Task R1** — Playwright CDN fix (independent; improves CI reliability)
3. **Task R2** — Linux spawner (independent of snapshotter)
4. **Task R4** — Linux snapshotter (benefits from R2 being done for end-to-end testing; update runner.ts Linux branch from R6)
5. **Task R3** — Windows spawner (depends on HLD-00003 Windows ConPTY decisions)
6. **Task R5** — Windows snapshotter (depends on R3; update runner.ts Windows branch from R6)

Tasks R1, R2, and R6 can proceed in parallel. Tasks R3-R5 are blocked on the Windows session model decision.

---

## 4. Interfaces and Contracts

### TerminalBackend (from @mcp-tuikit/core)

The flow engine depends on TerminalBackend which provides: createSession, closeSession, sendKeys, waitForText, getScreenPlaintext, getScreenJson, and getSessionState. The runner only uses createSession, closeSession, sendKeys, and waitForText. It also relies on an undocumented onData method accessed via type cast; this should be formalized in the interface.

### SpawnResult

Returned by spawnTerminal and consumed by closeTerminal. Contains windowHandle (for AppleScript terminals), optional pid (for directly-spawned processes), and optional tmpConfig (temp file path for cleanup).

### Artifact

Produced by FlowRunner.run. Contains path (filesystem location), format (png or txt), and intent (semantic context string).

### Flow and Action

Zod-validated schemas. Flow has a version string, optional description, and an ordered array of Action steps. Action is a discriminated union on the action field.

---

## 5. Cross-Cutting Concerns

**tmux dependency:** The entire non-Playwright path assumes tmux is available. This is reasonable on macOS and Linux but problematic on Windows. The Windows tasks (R3, R5) must either mandate tmux-via-WSL or implement an alternative session mechanism.

**Startup delay:** All direct-spawn terminals use a hardcoded 3-second startup delay. This is fragile — slow machines may need longer, fast machines waste time. Consider replacing with a polling mechanism that checks for window appearance (similar to the macOS snapshotter's poll loop).

**onData type safety:** The runner casts the backend to any to access onData. This method should be added to the TerminalBackend interface or a separate StreamableBackend interface that extends it.

**Error reporting:** Snapshot failures should produce structured errors that include the backend name, platform, and attempted output path so callers can diagnose issues without reading source.

# Flow Engine Multi-Backend Terminal Rendering LLD

