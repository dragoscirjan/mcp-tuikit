---
id: "00010"
type: lld
title: "SessionHandler and TerminalBackend Refactoring"
version: 1
status: draft
opencode-agent: lead-engineer
---

# SessionHandler and TerminalBackend Refactoring

## 1. Context & Motivation

Currently, the `mcp-tuikit` codebase uses widespread conditionals (`if (backendConfig !== 'xterm.js')`) to differentiate between running a headless "Playwright-based" flow versus a native terminal flow. Additionally, `TUIKIT_HEADLESS=1` is partially ignored, leading to bugs (e.g., TS6133 unused `headed` variable in `src/index.ts`).
Furthermore, stubbed implementations for Windows and Linux snapshotters were speculative and add noise without adding actual functionality.

We will introduce a cleaner abstraction:
1.  **`SessionHandler`**: A class that encapsulates the interaction with the underlying pseudoterminal multiplexer (`tmux`, and later `conpty` for Windows). It handles input/output/state.
2.  **`TerminalBackend`**: A class that encapsulates the *presentation* and *snapshot* layer (e.g., Playwright, Native Terminal).

## 2. Core Architecture

### 2.1 Packages Layout

The `packages/flow-engine` should only focus on YAML flow execution (`schema.ts`, `runner.ts`). Terminal and multiplexing logic must be decoupled since `src/index.ts` uses them for generic MCP tools (`create_session`, `send_keys`).

We introduce `packages/terminals` to house the `TerminalBackend` implementations and factory.

1.  **`packages/core`**: `SessionHandler.ts`, `TerminalBackend.ts`, `SnapshotStrategy.ts`
2.  **`packages/tmux`**: `TmuxSessionHandler.ts` (implements `SessionHandler`)
3.  **`packages/terminals`**: `PlaywrightBackend.ts`, `NativeTerminalBackend.ts`, `BackendFactory.ts`, `spawner.ts`, `config.ts`, `snapshotters/*`
4.  **`packages/flow-engine`**: `runner.ts`, `schema.ts` (imports interfaces from `core` and `BackendFactory` from `terminals`)

### 2.2 Interfaces

```typescript
// packages/core/src/SessionHandler.ts
export interface SessionHandler {
  createSession(cmd: string, cols: number, rows: number, sessionName?: string): Promise<string>;
  closeSession(sessionId: string): Promise<void>;
  sendKeys(sessionId: string, keys: string): Promise<void>;
  getScreenPlaintext(sessionId: string, maxLines: number): Promise<string>;
  waitForText(sessionId: string, pattern: string, timeoutMs: number): Promise<boolean>;
  onData(sessionId: string, listener: (data: string) => void): { dispose: () => void };
}
```

```typescript
// packages/core/src/TerminalBackend.ts
import { SessionHandler } from './SessionHandler';

export interface SpawnResult {
  windowHandle: string | null;
  pid?: number;
  tmpConfig?: string;
}

export abstract class TerminalBackend {
  constructor(protected sessionHandler: SessionHandler) {}
  
  public getHandler(): SessionHandler {
    return this.sessionHandler;
  }

  abstract spawn(sessionId: string, cmd: string, cols: number, rows: number): Promise<SpawnResult>;
  abstract close(spawnResult: SpawnResult): Promise<void>;
  abstract captureSnapshot(outputPath: string, cols: number, rows: number, sessionId: string): Promise<void>;
}
```

### 2.3 Backend Implementations (`packages/terminals`)

#### PlaywrightBackend
Runs the terminal in a headless or headed chromium instance using `xterm.js`.
- If `isHeadedMode()` returns true, chromium is launched headed.
- Captures snapshots natively via playwright screenshot.

#### NativeTerminalBackend
Spawns actual terminal applications (`alacritty`, `iterm2`, `ghostty`, `wezterm`).
- Leverages a `SnapshotStrategy` to capture screenshots.

### 2.4 SnapshotStrategy (Platform Abstraction)

Instead of hardcoded stub classes for Windows/Linux that throw errors:
```typescript
// packages/core/src/SnapshotStrategy.ts
export interface SnapshotStrategy {
  capture(outputPath: string, cols: number, rows: number, tmuxSession: string): Promise<void>;
}
```
`packages/terminals/src/snapshotters/index.ts` will return `MacOsSnapshotter` if `process.platform === 'darwin'`, else throw a clear error.

### 2.5 BackendFactory

A single source of truth for constructing the engine stack.
```typescript
// packages/terminals/src/BackendFactory.ts
export function createTerminalBackend(): TerminalBackend {
  const config = getBackendConfig();
  const handler = new TmuxSessionHandler();
  
  if (config === 'xterm.js') {
    return new PlaywrightBackend(handler);
  }
  
  return new NativeTerminalBackend(handler, config);
}
```

## 3. Tasks

- **Task 1: Core Interfaces & Packages Setup**
  - Create `packages/terminals` package layout.
  - Update `packages/core/src/TerminalBackend.ts` to `SessionHandler.ts` and `TerminalBackend.ts`.

- **Task 2: Implement `TmuxSessionHandler`**
  - Rename `packages/tmux/src/TmuxBackend.ts` to `TmuxSessionHandler.ts`.
  - Implement `SessionHandler` interface.

- **Task 3: Move Terminal Logic to `packages/terminals`**
  - Move `spawner.ts`, `config.ts`, and `snapshotters` to `packages/terminals`.
  - Extract the `xterm.js` playwright spawn and capture logic into `PlaywrightBackend.ts`.
  - Implement `NativeTerminalBackend.ts`.

- **Task 4: Clean up `packages/flow-engine` and `src/index.ts`**
  - Make `FlowRunner` accept a `TerminalBackend` instance.
  - Update `src/index.ts` to use `BackendFactory` from `packages/terminals`, removing logic branches.

