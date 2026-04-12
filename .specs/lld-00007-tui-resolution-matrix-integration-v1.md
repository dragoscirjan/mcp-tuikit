---
id: "00007"
type: lld
title: "TUI Resolution Matrix Integration"
version: 1
status: deprecated
opencode-agent: lead-engineer
---

# TUI Resolution Matrix Integration

## 1. Problem Statement

The user requires testing TUIs across multiple window resolutions defined in `TUI_TEST_RESOLUTIONS="640x480,1024x768,1280x720"` (in pixels) to ensure responsive rendering. The current MCP tools (`create_session` and `run_flow`) only accept fixed character dimensions (`cols` and `rows`). We need a mechanism to integrate pixel-based resolution testing seamlessly into the MCP.

## 2. Proposed Architecture

### 2.1 Font Size Heuristic (Pixels to Characters)

Terminal emulators calculate rows and columns based on the font size. We will use a standard monospaced font heuristic (e.g., 10x20 pixels per character):

- `cols = Math.floor(width / 10)`
- `rows = Math.floor(height / 20)`
*Note: This heuristic can be made configurable later via `TUI_CHAR_SIZE="10x20"` if needed, but we'll hardcode 10x20 as a default for now.*

### 2.2 Updating MCP Tools in `src/index.ts`

1. **`create_session` Tool Upgrade**:
   - Add an optional `resolution` field (string, e.g., `"1024x768"`).
   - If provided, it overrides `cols` and `rows` using the font size heuristic.
2. **New `run_flow_matrix` Tool**:
   - A new tool to run a defined YAML flow against a comma-separated list of resolutions.
   - **Input**:
     - `yaml_path`: Path to the flow file.
     - `resolutions` (optional): String like `"640x480,1024x768,1280x720"`. Defaults to `process.env.TUI_TEST_RESOLUTIONS`.
   - **Behavior**:
     - The tool parses the YAML flow.
     - For each resolution, it overrides the `spawn` step's `cols` and `rows` and suffixes any `snapshot` output paths (e.g., `output.png` -> `output-1024x768.png`).
     - It aggregates all the artifacts (snapshots) generated from all resolutions and returns them.

### 2.3 Environment Variable

- We will document `TUI_TEST_RESOLUTIONS="640x480,1024x768,1280x720"` inside `.env.example`.

## 3. Implementation Tasks

1. **`packages/core/src/utils.ts` (New file)**:
   - Implement `parseResolutions(resolutionStr: string)` returning an array of `{ width, height, cols, rows }` assuming a `10x20` character size.
   - Write tests in `packages/core/test/utils.test.ts`.
2. **`packages/flow-engine/src/runner.ts`**:
   - Update `FlowRunner.run(flow, overrideCols?, overrideRows?, suffix?)` to accept optional dimensions and an output suffix (to avoid overwriting snapshots).
   - Alternatively, inject the overrides directly into a deep clone of the `flow` object before running.
3. **`src/index.ts`**:
   - Add the `run_flow_matrix` tool that reads `process.env.TUI_TEST_RESOLUTIONS`, loops over each parsed resolution, and executes `FlowRunner.run` with the cloned and modified flow schema.
   - Add `resolution` to `create_session`'s Zod schema and logic.
4. **Documentation**:
   - Add the new env var to `.env.example` and update the README if applicable.

## 4. Testing (TDD)

- Test `parseResolutions` parsing logic.
- Test that modifying the flow schema appends resolution strings to output paths properly.
- Run an e2e test with `mcp-tuikit-dev_run_flow_matrix` and verify multiple sized snapshots are created.

