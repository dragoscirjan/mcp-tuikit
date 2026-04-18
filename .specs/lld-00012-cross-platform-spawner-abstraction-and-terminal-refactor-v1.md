---
id: "00012"
type: lld
title: "Cross-Platform Spawner Abstraction and Terminal Refactor"
version: 1
status: draft
opencode-agent: lead-engineer
---

# Cross-Platform Spawner Abstraction and Terminal Refactor

## Background
Currently, `NativeTerminalBackend` in `packages/terminals` is a monolithic class managing multiple terminal applications via a `switch(backendConfig)`. It conflates terminal-specific commands (e.g. `Alacritty`'s TOML, `Ghostty`'s `--class`) with OS-specific commands (e.g. `open -n -a` or `.pid` from `execa`). We need to decouple OS process and window management into a distinct "Spawner" layer using the Strategy Pattern, and split terminal tools into dedicated classes. This sets the stage for clean Windows and Linux support later.

## Objectives
1. Introduce a generic `AppSpawner` abstraction inside `@mcp-tuikit/core` that standardizes process launching and Window ID retrieval.
2. Provide concrete macOS implementations (`MacOsNativeSpawner`, `MacOsOpenSpawner`) utilizing our `get-macos-app-wid.swift` script.
3. Replace the `NativeTerminalBackend` monolith with dedicated backends: `AlacrittyBackend`, `GhosttyBackend`, and `WezTermBackend`.
4. Define a factory pattern that matches the terminal backend with the appropriate OS spawner at runtime.

## Architecture

### 1. `packages/core/src/spawn/AppSpawner.ts`
Defines the cross-platform contract:

```typescript
export interface SpawnOptions {
  appName: string; // Used for window identification (e.g. "Alacritty")
  executable: string; // The binary to execute (e.g. "alacritty", "open")
  args: string[];
  env?: Record<string, string>;
}

export interface SpawnResult {
  pid: number | null;
  windowId: string | null;
}

export interface AppSpawner {
  spawn(options: SpawnOptions): Promise<SpawnResult>;
  kill(pid: number): Promise<void>;
}
```

### 2. `packages/core/src/spawn/macos/`
*   **`getWindowId.ts`**: Helper that compiles/runs the Swift script `get-macos-app-wid.swift`. Given a PID or App Name, it returns the macOS Window ID.
*   **`MacOsNativeSpawner.ts`**: Implements `AppSpawner`. Uses Node's `execa(executable, args)` in detached mode. Captures the `.pid` immediately, then polls `getWindowId(pid)`.
*   **`MacOsOpenSpawner.ts`**: Implements `AppSpawner`. Uses `execa('open', ['-na', executable, '--args', ...args])`. Uses `pgrep -nx` to find the newest PID matching the `appName`, then queries `getWindowId(pid)`.

### 3. Scripts
*   Extract `experiments/get-macos-app-wid.swift` to `packages/core/scripts/get-macos-app-wid.swift`.

### 4. `packages/terminals/src/backends/`
Create specific backend classes extending `TerminalBackend`. They will take an `AppSpawner` instance.

*   **`AlacrittyBackend`**: Generates the temporary config and delegates execution to `MacOsOpenSpawner`.
*   **`GhosttyBackend`**: Generates `--class=...` identifier and delegates execution to `MacOsOpenSpawner`.
*   **`WezTermBackend`**: Uses direct binary path (`wezterm-gui start`) and delegates execution to `MacOsNativeSpawner`.

*Note: Remove `NativeTerminalBackend.ts` entirely.*

## Tasks
1. Move the Swift script to `packages/core/scripts/get-macos-app-wid.swift`.
2. Implement `AppSpawner` and macOS variants in `packages/core/src/spawn/`.
3. Export new spawn classes and interfaces from `@mcp-tuikit/core`.
4. Implement `AlacrittyBackend`, `GhosttyBackend`, `WezTermBackend` in `packages/terminals/src/backends/`.
5. Update `TerminalBackend.ts` to fully remove `switch` logic and utilize the `[IdType, IdType]` return tuple in `spawn()`.
6. Refactor the backend factory/provider (in `src/index.ts` or server setup) to instantiate the new specific classes with the appropriate OS-level spawner based on `process.platform`.
7. Verify and run existing tests. Ensure `TerminalBackend` `spawn()` now properly sets and utilizes the returned `windowId`.

