---
id: "00007"
type: lld
title: "TUI Resolution Matrix Integration"
version: 2
status: superseded
opencode-agent: lead-engineer
---

# TUI Resolution Matrix Integration

## 1. Problem Statement (v2 — amended from v1)

The original v1 spec introduced `parseResolutions` and `run_flow_matrix` (cols/rows heuristic). These are partially implemented. This v2 addresses **four concrete bugs and one design gap** discovered during live testing:

1. **Wrong tmux session captured in `txt` snapshot** — `FlowRunner.spawn` (non-Playwright path) creates an outer tmux session (`mcp-TIMESTAMP`) wrapping an inner session (`tuikit_XXX`). `snapshot txt` runs `tmux capture-pane -t mcp-TIMESTAMP`, capturing the outer shell, not the app.
2. **iTerm2 window size not driven by resolution** — `spawner.ts` sets `columns`/`rows` (character grid) on the iTerm2 window but there is no mechanism to size the iTerm2 window in pixels. `captureMacOsWindow` just grabs whatever window is open; the resolution parameter has no effect on the actual screenshot dimensions.
3. **Stale flow YAML files** — `btop_test.yaml` waits for `"Tasks"` (an htop string, not btop) and `test_flow.yaml` has no sort step. Both mislead users.
4. **No CPU-sort step in any flow** — No YAML flow sends the correct keys to sort btop by CPU descending before snapshotting.

## 2. Key Insight: tmux Resizes on Attach

tmux's `-x cols -y rows` at session creation is just an initial size. The moment a terminal emulator (iTerm2) attaches to it, **tmux re-adapts to the window's actual pixel dimensions**. This means:

- The `cols`/`rows` passed to `tmux new-session` are irrelevant for the iTerm2 path — tmux will resize to fit iTerm2's window
- **The iTerm2 window pixel size is the single source of truth for resolution**
- The `txt` snapshot (via `tmux capture-pane`) reflects the real cols/rows after resize
- The `png` snapshot (via `screencapture`) captures real pixels

`cols`/`rows` remain useful only as a fallback for headless/non-GUI paths (e.g. Playwright, future CI path).

## 3. Fixes

### 3.1 Fix `txt` snapshot — capture the correct inner tmux session

In `runner.ts`, store the inner tmux session name (`tuikit_XXX`) as `this.innerSessionName` during `spawn`. In the `snapshot txt` handler, use `this.innerSessionName` instead of `this.sessionId` for `tmux capture-pane`.

### 3.2 Fix iTerm2 window pixel sizing

In `spawner.ts` (iterm2 case), replace `set columns` / `set rows` (character grid) with `set bounds` (pixel rectangle). Accept `width` and `height` (pixels) in `spawnTerminal`.

- Default: derive from cols/rows via inverse heuristic (`width = cols * 10`, `height = rows * 20`) when no pixel resolution is provided
- When resolution is provided: use `width`/`height` directly

`runner.ts` passes `width`/`height` from `parseResolutions` result to `spawnTerminal`. tmux session is still created with cols/rows (its native unit) but will resize on attach anyway.

### 3.3 Delete stale YAML files

- Delete `btop_test.yaml` (waits for `"Tasks"` — htop string, not btop)
- Delete `test_flow.yaml` (no sort step, wrong for CPU-desc requirement)

### 3.4 Add correct btop flow YAML

Add `btop_cpu_desc.yaml`:
1. Spawn `btop`
2. Wait for btop to load (pattern: `CPU`)
3. Send key `e` to sort by CPU descending
4. Wait for sort to apply (pattern: `CPU`)
5. Snapshot `txt`
6. Snapshot `png`

## 4. Implementation Tasks (in order)

1. **`packages/flow-engine/src/spawner.ts`**
   - Add `width` and `height` pixel params to `spawnTerminal` signature
   - Default: `width = cols * 10`, `height = rows * 20`
   - iTerm2 case: replace `set columns/rows` with `set bounds {0, 0, width, height}`

2. **`packages/flow-engine/src/runner.ts`**
   - Store inner tmux session name as `this.innerSessionName` in `spawn` step
   - Use `this.innerSessionName` in `snapshot txt` for `tmux capture-pane`
   - Pass `width`/`height` (from step or derived from cols/rows) to `spawnTerminal`

3. **Delete** `btop_test.yaml` and `test_flow.yaml` from repo root

4. **Add** `btop_cpu_desc.yaml` at repo root

## 5. Files Changed

| File | Change |
|------|--------|
| `packages/flow-engine/src/spawner.ts` | Accept `width`/`height`, use `set bounds` for iTerm2 |
| `packages/flow-engine/src/runner.ts` | Store `innerSessionName`, fix txt capture, pass pixel dims to spawner |
| `btop_test.yaml` | **Delete** |
| `test_flow.yaml` | **Delete** |
| `btop_cpu_desc.yaml` | **New** — correct btop CPU-desc flow |

## 6. Out of Scope (deferred)

- Playwright rendering path (`rollingBuffer` / `onData` on TmuxBackend) — deferred
- Windows / Linux terminal backends — deferred
- `TUI_TEST_RESOLUTIONS` env var documentation — already done in v1
