---
id: "00008"
type: lld
title: "Playwright xterm.js Hardening, Linux & Windows Spawners and Snapshotters"
version: 1
status: approved
parent: "00002"
opencode-agent: lead-engineer
---

# LLD 00008: Playwright xterm.js Hardening, Linux & Windows Spawners and Snapshotters

## 1. Overview

This LLD addresses six gaps in the flow engine's cross-platform support:

1. The Playwright backend in `packages/flow-engine/src/backends/playwright.ts` loads `@xterm/xterm` CSS and JS from the unpkg CDN at runtime. This breaks in CI (no network), offline environments, and is fragile against CDN outages or version drift. The fix is to bundle the xterm.js browser assets locally.

2. Linux has no terminal spawner. The config module (`config.ts`) defaults to `gnome-terminal` on Linux, but the spawner switch statement has no case for it and throws "Unknown terminal backend."

3. Linux has no native snapshotter. When the backend is not Playwright and the platform is Linux, `runner.ts` falls through silently, producing no PNG snapshot.

4. Windows has no terminal spawner. The config module defaults to `windows-terminal` on Windows, but the spawner has no case for it.

5. Windows has no native snapshotter. Same silent fall-through as Linux.

6. The `runner.ts` snapshot branch only handles Playwright and macOS; Linux and Windows are missing.

All changes stay within `packages/flow-engine`. No changes to `packages/spawn` or `packages/tmux` are needed. All new dependencies must be MIT-compatible.

## 2. Architecture: Component Breakdown

### Files Modified

| File | Change Summary |
|------|---------------|
| `packages/flow-engine/package.json` | Add `@xterm/xterm` as a dependency (browser build for Playwright HTML template) |
| `packages/flow-engine/src/backends/playwright.ts` | Replace CDN URLs with locally-read xterm.js and xterm.css inlined into the HTML template |
| `packages/flow-engine/src/spawner.ts` | Add cases for `gnome-terminal`, `xterm` (Linux), and `windows-terminal` (Windows) |
| `packages/flow-engine/src/runner.ts` | Add `else if` branches for `linux` and `win32` in the PNG snapshot path |
| `packages/flow-engine/src/config.ts` | Add headless detection for Linux (no DISPLAY and no WAYLAND_DISPLAY) to auto-select Playwright |
| `packages/flow-engine/src/index.ts` | Re-export the new snapshotters |

### Files Created

| File | Purpose |
|------|---------|
| `packages/flow-engine/src/snapshotters/linux.ts` | X11 window capture using xdotool + import (ImageMagick) or scrot |
| `packages/flow-engine/src/snapshotters/linux.spec.ts` | Unit tests for Linux snapshotter |
| `packages/flow-engine/src/snapshotters/windows.ts` | Window capture using PowerShell System.Drawing |
| `packages/flow-engine/src/snapshotters/windows.spec.ts` | Unit tests for Windows snapshotter |
| `packages/flow-engine/src/spawner-linux.spec.ts` | Unit tests for Linux spawner cases |
| `packages/flow-engine/src/spawner-windows.spec.ts` | Unit tests for Windows spawner cases |

## 3. Playwright xterm.js Hardening

### Problem

The current HTML template in `playwright.ts` loads two remote resources:

- `https://unpkg.com/@xterm/xterm/css/xterm.css`
- `https://unpkg.com/@xterm/xterm/lib/xterm.js`

These fail when there is no network (CI runners, air-gapped environments) and are subject to CDN availability and version drift.

### Solution: Install and Inline

**Step 1**: Add `@xterm/xterm` (the browser-targeted package) as a dependency in `packages/flow-engine/package.json`. The package is MIT-licensed. Note: `@xterm/headless` is already a dependency but provides no CSS or browser JS bundle.

**Step 2**: At runtime, `capturePlaywrightSnapshot` resolves the paths to the installed `@xterm/xterm` assets using Node's module resolution:

- CSS path: `require.resolve('@xterm/xterm/css/xterm.css')` (or the ESM equivalent using `import.meta.resolve` followed by `fileURLToPath`)
- JS path: `require.resolve('@xterm/xterm/lib/xterm.js')` (same approach)

Since the package is ESM (`"type": "module"`), use `createRequire(import.meta.url).resolve(...)` from `node:module` to resolve the file paths, then read the file contents with `fs.readFile`.

**Step 3**: Inline the CSS into a `<style>` tag and the JS into a `<script>` tag within the HTML template. This eliminates all network dependencies. The HTML is loaded via `page.setContent()` so there is no origin restriction on inline scripts.

**Step 4**: Remove the `waitUntil: 'networkidle'` option from `page.setContent()`. There are no network requests to wait for anymore. Replace with `waitUntil: 'domcontentloaded'` which is sufficient since all assets are inlined.

### Caching Consideration

Reading two files from disk on every snapshot call is negligible overhead (sub-millisecond). However, if the function is called repeatedly in a tight loop (multi-resolution matrix runs), the implementer may cache the CSS and JS strings in module-level variables after first read. This is optional and not required for correctness.

## 4. Linux Terminal Spawner

### Where

Add two new cases to the `switch` block in `packages/flow-engine/src/spawner.ts`: `gnome-terminal` and `xterm`.

### gnome-terminal Case

`gnome-terminal` supports launching with a command via `--` separator. The invocation attaches to the existing tmux session:

Invoke: `gnome-terminal --geometry={cols}x{rows} -- tmux attach -t {tmuxSessionName}`

Key behaviors:
- `--geometry` sets the character grid dimensions (same as cols x rows)
- `gnome-terminal` forks to the background by default (it does not hold the parent process). The function must find the resulting window PID for later cleanup.
- After launching, use `xdotool search --name {tmuxSessionName}` (with a polling loop, up to 5 seconds) to find the window ID. Then use `xdotool getwindowpid {windowId}` to retrieve the PID.
- Return a `SpawnResult` with `windowHandle` set to the X11 window ID string (needed by the Linux snapshotter) and `pid` set to the process PID.

### xterm Case (Fallback)

`xterm` is the lowest-common-denominator X11 terminal. Available on virtually every Linux with X11.

Invoke via `spawnDirectProcess` (existing helper): `xterm -geometry {cols}x{rows} -e tmux attach -t {tmuxSessionName}`

Unlike `gnome-terminal`, xterm holds the foreground process, so `spawnDirectProcess` (which uses `execa` with `detached: true`) handles it correctly. Return the PID directly from the spawned process.

### SpawnResult Extension

Add an optional `windowId` field to the `SpawnResult` interface:

`windowId?: string` — the X11 window ID (decimal string). Populated on Linux for native snapshotting. Not used on macOS or Windows.

### Headless Detection

In `config.ts`, before returning `gnome-terminal` as the Linux default, check for headless environments:

If `process.env.CI` is set, already returns `playwright` (existing behavior, no change needed).

If not CI but `process.env.DISPLAY` is empty/unset AND `process.env.WAYLAND_DISPLAY` is empty/unset, return `playwright`. This handles headless Linux servers, Docker containers, and remote SSH sessions where no display server is available. Log a warning to stderr indicating Playwright was auto-selected due to no display.

## 5. Linux Snapshotter

### File

`packages/flow-engine/src/snapshotters/linux.ts`

### Exported Function Signature

`captureLinuxWindow(backend: string, outputPath: string, windowId?: string, timeoutMs?: number, pollIntervalMs?: number): Promise<void>`

### Approach

**Step 1 — Resolve Window ID**: If `windowId` is provided (from `SpawnResult.windowId`), use it directly. Otherwise, search by backend name using `xdotool search --name {backend}`. Poll with the same timeout/interval pattern used by the macOS snapshotter (default 30 seconds, 200ms interval).

**Step 2 — Activate Window**: Bring the window to the foreground to avoid occlusion artifacts:

Run: `xdotool windowactivate {windowId}`

Wait 300ms for the compositor to render.

**Step 3 — Capture**: Use ImageMagick's `import` command, which captures a specific window by X11 ID without requiring the user to click:

Run: `import -window {windowId} {outputPath}`

This produces a PNG file. ImageMagick is MIT-compatible (Apache 2.0 derived license).

**Fallback**: If `import` is not available (check with `which import`), fall back to `scrot` with the focused-window flag:

Run: `scrot --focused {outputPath}`

`scrot` is MIT-licensed.

**Step 4 — Error Handling**: If neither `import` nor `scrot` is available, throw a descriptive error: "Linux snapshot requires ImageMagick (import) or scrot. Install one: apt install imagemagick or apt install scrot."

### Wayland Consideration

`xdotool` only works on X11. On pure Wayland (no XWayland), `xdotool search` will fail. For the initial implementation, the Wayland path is not supported for native snapshotting. When Wayland is detected (`WAYLAND_DISPLAY` is set and `DISPLAY` is unset), the config module already routes to Playwright. Document this limitation.

Future work: `grim` + `slurp` or `wlr-screencopy` for native Wayland capture.

### DPI Handling

Linux does not universally report HiDPI scaling for X11 windows. The captured image will be at native pixel resolution. No normalization is needed for the initial implementation, consistent with how the macOS snapshotter works (raw pixels from `screencapture`).

## 6. Windows Terminal Spawner

### Where

Add a `windows-terminal` case to the `switch` block in `packages/flow-engine/src/spawner.ts`.

### Architecture Decision: tmux on Windows

tmux does not run natively on Windows. It is available inside WSL (Windows Subsystem for Linux). The spawner must account for this.

The recommended approach: Windows Terminal (`wt.exe`) can launch a WSL profile directly. The flow engine on Windows assumes the MCP server itself runs inside WSL (since it depends on tmux from `@dragoscirjan/mcp-tuikit-tmux`). Windows Terminal attaches to the tmux session running in WSL.

### Invocation

Use `spawnDirectProcess` with:

Binary: `wt.exe` (available on PATH for any Windows 10 1903+ system with Windows Terminal installed; also the default terminal on Windows 11)

Arguments: `wt.exe -w 0 nt --size {cols},{rows} -- wsl tmux attach -t {tmuxSessionName}`

Breakdown:
- `-w 0` — target the default window (or create one)
- `nt` — open a new tab
- `--size {cols},{rows}` — set character grid dimensions
- `--` — command separator
- `wsl tmux attach -t {tmuxSessionName}` — run tmux attach inside the default WSL distro

### Alternative: Native Windows (MSYS2/Cygwin)

If the user is running the MCP server natively (not in WSL) with tmux from MSYS2/Cygwin, the `wsl` prefix should be omitted. Detect this by checking `process.env.WSL_DISTRO_NAME`:

- If set (running inside WSL): spawn `wt.exe -w 0 nt --size {cols},{rows} -- wsl -d {WSL_DISTRO_NAME} tmux attach -t {tmuxSessionName}` to target the specific distro.
- If not set and `process.platform === 'win32'`: assume native tmux (MSYS2/Cygwin) and spawn `wt.exe -w 0 nt --size {cols},{rows} -- tmux attach -t {tmuxSessionName}`.

### PID Tracking

`wt.exe` itself exits immediately after launching the tab. The actual shell process runs inside the Windows Terminal host. There is no reliable way to get the PID of the inner shell from `wt.exe`. Set `pid` to undefined in the `SpawnResult`. Cleanup relies on killing the tmux session itself (which is already handled by `FlowRunner.cleanup()`).

### SpawnResult

Return: `{ windowHandle: null, pid: undefined }` — Window Terminal lifecycle is tied to the tmux session, not a trackable PID.

### closeTerminal Handling

The existing `closeTerminal` function already handles the case where `pid` is null and `windowHandle` is null (it simply returns). No change needed. The tmux session kill in `FlowRunner.cleanup()` causes the Windows Terminal tab to close automatically.

## 7. Windows Snapshotter

### File

`packages/flow-engine/src/snapshotters/windows.ts`

### Exported Function Signature

`captureWindowsWindow(backend: string, outputPath: string, timeoutMs?: number, pollIntervalMs?: number): Promise<void>`

### Approach: PowerShell System.Drawing

Windows does not have a simple CLI screenshot tool like `screencapture` or `scrot`. The approach uses PowerShell with .NET's System.Drawing (part of the .NET runtime, no admin rights needed, no external dependencies).

**Step 1 — Find Window Handle**: Use PowerShell to find the Windows Terminal window:

Run a PowerShell script via `child_process.exec` that:
- Loads `System.Runtime.InteropServices` to call `user32.dll` functions
- Calls `FindWindow` or enumerates windows via `EnumWindows` to find the one with "Windows Terminal" in the title
- Returns the HWND as a decimal string

Alternatively (simpler): use `powershell -Command "(Get-Process -Name WindowsTerminal | Select-Object -First 1).MainWindowHandle"` to get the main window handle. This is the simplest reliable approach.

Poll for the window handle with the same timeout pattern (default 30 seconds, 200ms interval).

**Step 2 — Activate Window**: Bring the window to the foreground:

Run: `powershell -Command "(New-Object -ComObject WScript.Shell).AppActivate('Windows Terminal')"` — this uses COM automation to activate by window title. Simpler and equally effective.

Wait 500ms for the compositor to render.

**Step 3 — Capture**: Use PowerShell with `System.Drawing` to capture the specific window:

The PowerShell script:
- Calls `GetWindowRect` (from user32.dll via P/Invoke) to get the window bounds (left, top, right, bottom)
- Creates a `System.Drawing.Bitmap` of the window dimensions
- Creates a `System.Drawing.Graphics` object from the bitmap
- Calls `CopyFromScreen` to capture the region
- Saves to the output path as PNG

This approach:
- Requires no admin rights
- Works with any .NET installation (System.Drawing is in the base class library)
- Captures the exact window region, not the entire screen
- Handles DPI scaling correctly (the coordinates from `GetWindowRect` are in physical pixels on DPI-aware processes)

**Step 4 — Error Handling**: If PowerShell is not available or the script fails, throw a descriptive error. PowerShell is present on all Windows 10+ systems.

### PowerShell Execution Policy

The snapshot script runs as an inline command (`-Command` flag), not as a script file, so execution policy restrictions do not apply.

### Alternative Considered: node-ffi-napi / koffi

Using a Node.js FFI library to call Win32 APIs directly was considered. Rejected because:
- `node-ffi-napi` requires native compilation (node-gyp), which adds build complexity and CI burden
- `koffi` is simpler but adds a binary dependency
- PowerShell is zero-dependency on Windows and achieves the same result
- The snapshot operation is not performance-critical (called once per snapshot action)

## 8. runner.ts Wiring

### Current State (lines 140-146 of runner.ts)

The snapshot PNG branch currently has:

```
if (this.backendConfig === 'playwright') {
    await capturePlaywrightSnapshot(...)
} else if (process.platform === 'darwin') {
    await captureMacOsWindow(...)
}
// Linux and Windows: silent fall-through, no PNG produced
```

### Changes

Add two new `else if` branches after the macOS check:

**Linux branch** (`process.platform === 'linux'`): Import and call `captureLinuxWindow` from `./snapshotters/linux.js`, passing `this.backendConfig`, `outputPath`, and `this.spawnResult?.windowId`.

**Windows branch** (`process.platform === 'win32'`): Import and call `captureWindowsWindow` from `./snapshotters/windows.js`, passing `this.backendConfig` and `outputPath`.

**Fallback else**: After all platform branches, add a final `else` that throws an error: "PNG snapshot not supported on platform: {process.platform}. Use format: txt or set TUIKIT_TERMINAL=playwright." This replaces the current silent failure.

### Import Changes

**Recommendation**: Use static imports for all snapshotters (consistent with current macOS pattern). The modules only call platform binaries inside their exported functions, not at import time. If any snapshotter introduces an import-time dependency in the future, switch to dynamic imports at that point.

### index.ts Re-exports

Add re-exports for the new snapshotters:

- `export { captureLinuxWindow } from './snapshotters/linux.js'`
- `export { captureWindowsWindow } from './snapshotters/windows.js'`

## 9. Edge Cases and Mitigations

### Playwright in CI (All Platforms)

When `process.env.CI` is set, `config.ts` returns `playwright`. The Playwright path creates the tmux session directly (no terminal spawner), captures via headless Chromium + xterm.js. This path works identically on macOS, Linux, and Windows CI runners. No changes needed to this flow other than the xterm.js bundling fix (Section 3).

### Linux Headless Without CI Flag

A user running on a headless Linux server (no DISPLAY, no WAYLAND_DISPLAY) without `CI=true` currently gets `gnome-terminal` as the backend, which will fail at spawn time. The config module change (Section 4) addresses this by auto-selecting Playwright when no display is detected.

### Windows Without Windows Terminal

If `wt.exe` is not on PATH (older Windows 10 without Windows Terminal installed), the spawner should check for `wt.exe` availability at spawn time and throw a descriptive error: "Windows Terminal (wt.exe) not found. Install it from the Microsoft Store or set TUIKIT_TERMINAL=playwright for headless mode."

### Windows Without WSL

If the MCP server detects it is running natively on Windows (not in WSL) and tmux is not available in PATH, the tmux backend itself will fail before the spawner is ever called. This is an existing constraint and out of scope for this LLD.

### Permission Errors on Linux

`xdotool` and `import`/`scrot` may fail if the X11 server denies access (e.g., inside a restricted container). Catch these errors and provide a message suggesting the user set `TUIKIT_TERMINAL=playwright` for containerized environments.

### Temporary File Cleanup (Windows)

The PowerShell snapshot approach writes directly to the output path. No temporary files are created, so no cleanup is needed.

## 10. Dependency Summary

| Dependency | License | Platform | Purpose | Type |
|-----------|---------|----------|---------|------|
| `@xterm/xterm` | MIT | All | Browser JS + CSS for Playwright HTML template | npm (new) |
| `xdotool` | Custom permissive | Linux | X11 window search and activation | System binary (pre-existing on most Linux desktops) |
| `imagemagick` (import) | Apache 2.0 | Linux | Window screenshot capture | System binary (optional) |
| `scrot` | MIT | Linux | Window screenshot capture (fallback) | System binary (optional) |
| `powershell` | MIT | Windows | Window discovery and screenshot via System.Drawing | System binary (pre-installed on Windows 10+) |
| `wt.exe` | MIT | Windows | Windows Terminal for spawning | System binary (pre-installed on Windows 11, optional on Windows 10) |

All npm dependencies are MIT. All system binaries are either MIT, Apache 2.0, or pre-installed OS components.

Note on xdotool: xdotool's license is described as "If you want to do something with xdotool and its source and the license is getting in your way, please contact me." In practice it is treated as permissive open-source compatible with MIT projects. If licensing review flags this, `xdg-utils` + `xprop` can serve as alternatives for window lookup.

## 11. Implementation Tasks (Ordered by Dependency)

### Task 1: Install @xterm/xterm and Harden Playwright Backend (1 file changed, 1 dependency added)

**Files**: `packages/flow-engine/package.json`, `packages/flow-engine/src/backends/playwright.ts`

- Add `@xterm/xterm` to dependencies in package.json
- In `playwright.ts`, resolve the paths to `@xterm/xterm/css/xterm.css` and `@xterm/xterm/lib/xterm.js` using `createRequire` from `node:module`
- Read both files into strings using `fs.readFile`
- Replace the CDN `<link>` and `<script src=...>` tags with inline `<style>` and `<script>` tags containing the file contents
- Change `waitUntil` from `networkidle` to `domcontentloaded`
- Write/update tests to verify the HTML template contains no external URLs

**Acceptance**: Running `capturePlaywrightSnapshot` with network disabled produces a valid PNG. No HTTP requests are made.

### Task 2: Update config.ts for Linux Headless Detection (1 file changed)

**Files**: `packages/flow-engine/src/config.ts`

- In the `linux` case of the platform switch, check if both `DISPLAY` and `WAYLAND_DISPLAY` are unset/empty
- If headless detected, return `playwright` and emit a warning to stderr
- Update existing `config.spec.ts` tests to cover the new headless detection branch

**Acceptance**: On a Linux system without DISPLAY or WAYLAND_DISPLAY set, `getBackendConfig()` returns `playwright`.

### Task 3: Add Linux Spawner Cases (1 file changed)

**Files**: `packages/flow-engine/src/spawner.ts`

- Add `windowId?: string` field to `SpawnResult` interface
- Add `gnome-terminal` case: launch with `--geometry` and `-- tmux attach`, poll for window ID via `xdotool search --name`
- Add `xterm` case: launch via `spawnDirectProcess` with `-geometry` and `-e tmux attach`
- Create `spawner-linux.spec.ts` with tests for both backends

**Acceptance**: `spawnTerminal('gnome-terminal', session, cols, rows)` returns a `SpawnResult` with a valid `windowId`. `spawnTerminal('xterm', session, cols, rows)` returns a `SpawnResult` with a valid `pid`.

### Task 4: Add Linux Snapshotter (1 new file)

**Files**: `packages/flow-engine/src/snapshotters/linux.ts`, `packages/flow-engine/src/snapshotters/linux.spec.ts`

- Implement `captureLinuxWindow` function following the approach in Section 5
- Window ID lookup via xdotool (with polling)
- Window activation via xdotool windowactivate
- Capture via `import -window` (ImageMagick) with `scrot --focused` fallback
- Tool availability check with descriptive error messages
- Unit tests mocking child_process calls

**Acceptance**: Given a valid X11 window ID, the function produces a PNG file at the output path. When neither `import` nor `scrot` is installed, a descriptive error is thrown.

### Task 5: Add Windows Spawner Case (1 file changed)

**Files**: `packages/flow-engine/src/spawner.ts`

- Add `windows-terminal` case: detect WSL vs native, construct `wt.exe` invocation
- Check `wt.exe` availability at spawn time; throw descriptive error if missing
- Return `SpawnResult` with `pid: undefined`, `windowHandle: null`
- Create `spawner-windows.spec.ts` with tests

**Acceptance**: `spawnTerminal('windows-terminal', session, cols, rows)` constructs the correct `wt.exe` command. When `wt.exe` is not found, a descriptive error is thrown.

### Task 6: Add Windows Snapshotter (1 new file)

**Files**: `packages/flow-engine/src/snapshotters/windows.ts`, `packages/flow-engine/src/snapshotters/windows.spec.ts`

- Implement `captureWindowsWindow` function following the approach in Section 7
- Window handle lookup via PowerShell Get-Process (with polling)
- Window activation via WScript.Shell COM automation
- Capture via PowerShell System.Drawing CopyFromScreen
- Unit tests mocking child_process.exec for PowerShell commands

**Acceptance**: Given a running Windows Terminal process, the function produces a PNG file at the output path. Without PowerShell, a descriptive error is thrown.

### Task 7: Wire Linux and Windows into runner.ts (2 files changed)

**Files**: `packages/flow-engine/src/runner.ts`, `packages/flow-engine/src/index.ts`

- Add `captureLinuxWindow` import and `else if (process.platform === 'linux')` branch in the snapshot PNG section of runner.ts
- Add `captureWindowsWindow` import and `else if (process.platform === 'win32')` branch
- Add final `else` that throws an unsupported-platform error
- Pass `this.spawnResult?.windowId` to the Linux snapshotter
- Add re-exports for both new snapshotters in index.ts
- Update `runner.spec.ts` if needed to verify the new branches are reached

**Acceptance**: On Linux with a spawned terminal, `snapshot png` produces a file. On Windows with a spawned terminal, `snapshot png` produces a file. On an unsupported platform, a clear error is thrown instead of silent failure.

## 12. Testing Strategy

All new code must have unit tests (TDD per CONTRIBUTING.md). Tests mock the underlying system calls (`child_process.exec`, `child_process.execFile`, `execa`) since the actual terminal emulators and screenshot tools are not available in the test environment.

**Integration testing** (manual or CI):
- Playwright path: testable on any CI runner (Linux, macOS, Windows) by setting `CI=true`
- Linux native path: requires a Linux desktop with X11, gnome-terminal or xterm, and ImageMagick or scrot
- Windows native path: requires Windows 10/11 with Windows Terminal and WSL
- macOS native path: already tested (existing implementation)

## 13. Out of Scope

- Wayland native snapshotting (use Playwright path for now)
- Linux terminal emulators other than gnome-terminal and xterm (Konsole, Alacritty, WezTerm on Linux can be added later; Alacritty and WezTerm spawner cases already exist but use macOS binary paths)
- Browser lifecycle pooling for Playwright (launching a fresh Chromium per snapshot is acceptable for now; optimization deferred)
- Windows ConPTY backend (HLD-00003 scope, separate from this LLD)

# Playwright xterm.js Hardening, Linux & Windows Spawners and Snapshotters

