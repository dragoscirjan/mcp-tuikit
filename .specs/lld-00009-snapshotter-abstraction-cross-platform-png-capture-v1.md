---
id: "00009"
type: lld
title: "Snapshotter Abstraction — Cross-Platform PNG Capture"
version: 1
status: draft
opencode-agent: lead-engineer
---

# Snapshotter Abstraction — Cross-Platform PNG Capture

## Problem

PNG capture in `create_snapshot` (MCP tool) and `runner.ts` (flow engine) is
hardcoded with `if (process.platform === 'darwin')` guards. Non-macOS platforms
return an error or are silently skipped. The Playwright renderer — which works
on **every** platform — is not wired into the MCP layer at all.

Additionally, macOS-specific code (`captureMacOsWindow`, Swift scripts,
`screencapture`, AppleScript) is imported unconditionally, which means it gets
bundled even on Linux and Windows where it is useless.

## Goals

1. Define a `Snapshotter` interface (one method: `capture(outputPath, cols, rows, tmuxSession)`).
2. Implement three concrete snapshotters:
   - `packages/flow-engine/src/snapshotters/macos.ts` — existing macOS logic, already present.
   - `packages/flow-engine/src/snapshotters/playwright.ts` — wraps `capturePlaywrightSnapshot`; reads ANSI from tmux pane before rendering.
   - `packages/flow-engine/src/snapshotters/linux.ts` — stub that throws `NotImplementedError` (placeholder for xdotool/scrot).
   - `packages/flow-engine/src/snapshotters/windows.ts` — stub that throws `NotImplementedError` (placeholder for PowerShell).
3. Implement a `resolveSnapshotter(backendConfig)` factory in
   `packages/flow-engine/src/snapshotters/index.ts` that selects the correct
   implementation based on `backendConfig` (env → platform).
4. Replace every `if (process.platform === 'darwin')` and `if (backendConfig === 'playwright')`
   guard in `runner.ts` and `src/index.ts` with a single `snapshotter.capture(...)` call.
5. Expose the `Snapshotter` interface from `@dragoscirjan/mcp-tuikit-core` so external packages
   can implement their own without depending on `flow-engine`.

## Interface

```ts
// packages/spawn/src/Snapshotter.ts
export interface Snapshotter {
  /**
   * Capture a PNG of the current terminal state.
   * @param outputPath  Absolute path where the PNG should be written.
   * @param cols        Terminal width in columns.
   * @param rows        Terminal height in rows.
   * @param tmuxSession Inner tmux session name (for ANSI read-back in Playwright mode).
   */
  capture(outputPath: string, cols: number, rows: number, tmuxSession: string): Promise<void>;
}
```

## Factory

```ts
// packages/flow-engine/src/snapshotters/index.ts
export function resolveSnapshotter(backendConfig: string): Snapshotter {
  if (backendConfig === 'playwright') return new PlaywrightSnapshotter();
  switch (process.platform) {
    case 'darwin':  return new MacOsSnapshotter(backendConfig);
    case 'linux':   return new LinuxSnapshotter();
    case 'win32':   return new WindowsSnapshotter();
    default:        return new PlaywrightSnapshotter(); // safest universal fallback
  }
}
```

The factory is the **only** place platform/backend branching occurs.

## File Map

| File | Action |
|------|--------|
| `packages/spawn/src/Snapshotter.ts` | **NEW** — `Snapshotter` interface |
| `packages/spawn/src/index.ts` | **EDIT** — re-export `Snapshotter` |
| `packages/flow-engine/src/snapshotters/macos.ts` | **EDIT** — implement `Snapshotter` via `MacOsSnapshotter` class; keep existing `captureMacOsWindow` as internal helper |
| `packages/flow-engine/src/snapshotters/playwright.ts` | **NEW** — `PlaywrightSnapshotter` reads ANSI from tmux, calls `capturePlaywrightSnapshot` |
| `packages/flow-engine/src/snapshotters/linux.ts` | **NEW** — `LinuxSnapshotter` stub |
| `packages/flow-engine/src/snapshotters/windows.ts` | **NEW** — `WindowsSnapshotter` stub |
| `packages/flow-engine/src/snapshotters/index.ts` | **NEW** — `resolveSnapshotter` factory + barrel re-export |
| `packages/flow-engine/src/runner.ts` | **EDIT** — remove platform guards; use `resolveSnapshotter` |
| `packages/flow-engine/src/index.ts` | **EDIT** — export `resolveSnapshotter` and `Snapshotter`; remove direct `captureMacOsWindow` export |
| `src/index.ts` | **EDIT** — remove `captureMacOsWindow` import and `if (process.platform === 'darwin')` guard; use `resolveSnapshotter` |

## Snapshotter Implementations

### `MacOsSnapshotter`
```ts
class MacOsSnapshotter implements Snapshotter {
  constructor(private appName: string) {}
  async capture(outputPath, cols, rows, _tmuxSession) {
    await captureMacOsWindow(this.appName, outputPath);
  }
}
```

### `PlaywrightSnapshotter`
```ts
class PlaywrightSnapshotter implements Snapshotter {
  async capture(outputPath, cols, rows, tmuxSession) {
    const { stdout } = await execAsync(`tmux capture-pane -p -e -t ${tmuxSession}`);
    await capturePlaywrightSnapshot(stdout, outputPath, cols, rows);
  }
}
```
`-e` flag preserves escape sequences so xterm.js renders colours correctly.

### `LinuxSnapshotter` / `WindowsSnapshotter`
```ts
class LinuxSnapshotter implements Snapshotter {
  async capture() {
    throw new Error('Linux PNG snapshotter not yet implemented. Set TUIKIT_TERMINAL=playwright to use the Playwright renderer.');
  }
}
```

## Tests

| Test file | What changes |
|-----------|-------------|
| `packages/flow-engine/src/snapshotters/playwright.spec.ts` | **NEW** — unit test for `PlaywrightSnapshotter`: mocks `execAsync` + `capturePlaywrightSnapshot`; verifies tmux read-back with `-e` flag and correct arg forwarding |
| `packages/flow-engine/src/snapshotters/index.spec.ts` | **NEW** — unit tests for `resolveSnapshotter`: verifies playwright → `PlaywrightSnapshotter`, darwin → `MacOsSnapshotter`, linux → `LinuxSnapshotter`, win32 → `WindowsSnapshotter` |
| `packages/flow-engine/src/runner.spec.ts` | **EDIT** — update mock to use `Snapshotter` interface instead of `captureMacOsWindow` |
| `packages/flow-engine/src/snapshotters/macos.spec.ts` | **EDIT** — add tests for the new `MacOsSnapshotter` class wrapper |

## Implementation Order

1. `packages/spawn/src/Snapshotter.ts` + re-export from `core/src/index.ts`
2. `packages/flow-engine/src/snapshotters/playwright.ts`
3. `packages/flow-engine/src/snapshotters/linux.ts` + `windows.ts`
4. Edit `packages/flow-engine/src/snapshotters/macos.ts` — add `MacOsSnapshotter` class
5. `packages/flow-engine/src/snapshotters/index.ts` — factory + barrel
6. Edit `packages/flow-engine/src/runner.ts` — replace guards with `resolveSnapshotter`
7. Edit `packages/flow-engine/src/index.ts` — update exports
8. Edit `src/index.ts` — replace guards with `resolveSnapshotter`
9. Write / update all unit tests
10. Build + run all tests

