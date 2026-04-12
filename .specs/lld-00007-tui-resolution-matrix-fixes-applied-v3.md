---
id: "00007"
type: lld
title: "TUI Resolution Matrix — Fixes Applied"
version: 3
status: approved
opencode-agent: lead-engineer
---

# LLD-00007 v3 — TUI Resolution Matrix: Fixes Applied

## 1. Purpose

This v3 reconciles LLD-00007 v2 (four bugs + one design gap) against the actual codebase state as of 2026-04-13. Two bugs are confirmed fixed, one is confirmed complete, and one item was never implemented.

## 2. Bug Status Summary

| Bug | Description | Status | Evidence |
|-----|-------------|--------|----------|
| 1 | Wrong tmux session captured in txt snapshot | DONE | `runner.ts` stores `innerSessionName` at spawn; `snapshot txt`, `wait_for`, and `waitForPattern` all resolve `innerSessionName ?? sessionId`. MCP-level `create_snapshot` and `wait_for_text` tools in `src/index.ts` also target `entry.tmuxSession` (the inner session). |
| 2 | iTerm2 window not pixel-sized | DONE | `spawner.ts` accepts optional `width` and `height` params. Derives `pixelWidth = width ?? cols * 10 + 50` and `pixelHeight = height ?? rows * 20 + 50`. iTerm2 case uses `set bounds to {0, 0, pixelWidth, pixelHeight}`. |
| 3 | Stale YAML files (btop_test.yaml, test_flow.yaml) | DONE | Neither file exists anywhere in the repo. No `flows/` directory exists. Glob search across all YAML/YML files returns only `pnpm-lock.yaml` and `pnpm-workspace.yaml`. |
| 4 | No CPU-sort flow for btop | NOT DONE | No `btop_cpu_desc.yaml`, `btop.yaml`, or any flow YAML exists in the repo. The `flows/` directory was removed entirely. |

## 3. Detailed Findings

### 3.1 Bug 1 — txt Snapshot Captures Inner Session (DONE)

The v2 spec called for storing the inner tmux session name and using it for capture-pane. This is fully implemented:

- `FlowRunner` in `packages/flow-engine/src/runner.ts` declares `innerSessionName` as a private field, assigned during `spawn` from the generated `tuikit_XXX` name.
- The `snapshot txt` handler uses `captureTarget = this.innerSessionName ?? this.sessionId` before invoking `tmux capture-pane`.
- The `waitForPattern` method (both stream-listening and polling paths) resolves `this.innerSessionName ?? this.sessionId`.
- The `cleanup` method kills both the outer and inner sessions.
- The MCP tool layer (`src/index.ts`) stores `tmuxSession` in the session registry and uses it directly for `create_snapshot` (txt capture) and `wait_for_text`.

No further action required.

### 3.2 Bug 2 — iTerm2 Pixel Sizing via set bounds (DONE)

The v2 spec called for replacing `set columns/rows` with `set bounds` and accepting pixel dimensions. This is fully implemented:

- `spawnTerminal` in `packages/flow-engine/src/spawner.ts` accepts `width?: number` and `height?: number` after the existing `cols`/`rows` params.
- When not provided, pixel dimensions default via heuristic: `cols * 10 + 50` and `rows * 20 + 50` (50px padding for window chrome).
- The iTerm2 AppleScript uses `set bounds to {0, 0, pixelWidth, pixelHeight}` instead of character-grid columns/rows.
- Other backends (Alacritty, Ghostty, WezTerm) continue to use their native column/row mechanisms.

No further action required.

### 3.3 Bug 3 — Stale YAML Files Deleted (DONE)

The v2 spec called for deleting `btop_test.yaml` and `test_flow.yaml`. Neither file exists in the repo. The entire `flows/` directory is absent. This is complete, though it appears all sample flow YAMLs were removed rather than just the stale ones.

No further action required for deletion. See section 4 for the missing btop flow.

### 3.4 Bug 4 — btop CPU-sort Flow YAML (NOT DONE)

The v2 spec called for adding `btop_cpu_desc.yaml` with a spawn-wait-sort-snapshot sequence. This file was never created. No flow YAML files of any kind exist in the repository.

This remains an open task.

## 4. Remaining Tasks

### Task 1: Create btop CPU-sort flow YAML

Add a sample flow YAML (suggested path: `flows/btop_cpu_desc.yaml` or repo root) with the following steps as specified in v2:

1. Spawn btop
2. Wait for btop to render (pattern matching CPU-related output)
3. Send the key to sort by CPU descending
4. Brief sleep for sort to apply
5. Snapshot txt
6. Snapshot png

The exact btop key binding for CPU sort and the appropriate wait pattern should be verified against the current btop version at implementation time.

### Task 2: Consider restoring other sample flows

The `flows/` directory and all sample YAMLs (htop-mem-sort, gh_dash, nvim_lazy_log) appear to have been removed. If these were intentionally cleaned up, no action needed. If accidental, they should be restored from git history.

This is an observation, not a hard requirement from the v2 spec.

## 5. Deferred / Out of Scope

### run_flow_matrix tool and TUI_TEST_RESOLUTIONS

The v1 spec introduced the concept of a `run_flow_matrix` MCP tool that would run a flow across multiple resolutions defined by a `TUI_TEST_RESOLUTIONS` environment variable. This was never implemented:

- No `run_flow_matrix` tool is registered in `src/index.ts`
- No `parseResolutions` utility or `TUI_TEST_RESOLUTIONS` parsing exists in the codebase
- The `run_flow` tool accepts single `cols`/`rows` params but has no multi-resolution support

This feature is deferred. It is not required by the v2 bugfix scope and should be tracked separately if still desired.

### Playwright rendering path

The Playwright backend path in `runner.ts` uses `capturePlaywrightSnapshot` (rendering from `rollingBuffer`). This path does not go through the iTerm2/tmux pixel-sizing logic. It remains a separate concern, unchanged by these fixes.

### Windows / Linux terminal backends

Only macOS backends (iTerm2, Alacritty, Ghostty, WezTerm) are implemented in `spawner.ts`. Cross-platform backends are out of scope for this LLD.

## 6. Files Reference

| File | Role | Bug Fix Status |
|------|------|----------------|
| `packages/flow-engine/src/runner.ts` | FlowRunner with innerSessionName fix | Bugs 1 — DONE |
| `packages/flow-engine/src/spawner.ts` | Terminal spawning with pixel bounds | Bug 2 — DONE |
| `src/index.ts` | MCP tool layer; uses inner tmuxSession | Bug 1 (tool layer) — DONE |
| `btop_test.yaml` | Was stale; to be deleted | Bug 3 — DONE (absent) |
| `test_flow.yaml` | Was stale; to be deleted | Bug 3 — DONE (absent) |
| `flows/btop_cpu_desc.yaml` | Correct btop CPU-desc flow | Bug 4 — NOT DONE |

