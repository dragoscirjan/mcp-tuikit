---
id: "00018"
type: lld
title: "Cross-OS Recording Capability Pipeline"
version: 1
status: draft
opencode-agent: lead-engineer
---

# Cross-OS Recording Capability Pipeline

## Summary

Implement a capability-driven recording pipeline for `mcp-tuikit` that works consistently across macOS, Linux, and Windows without coupling correctness to any specific TUI application. The design introduces a recording abstraction with `asciinema` as primary capture format (`.cast`) and optional post-processing (GIF/MP4) via external renderers.

This LLD intentionally supersedes the previous HLD assumptions for this feature and focuses on:

- Cross-OS behavior parity through common interfaces
- Capability detection and graceful degradation
- Deterministic test assertions from text/snapshot artifacts, with video as auxiliary artifact
- Robust lifecycle management to prevent orphaned sessions/processes

## Goals

1. Add optional session recording for both `create_session` and `run_flow` paths.
2. Keep one public MCP contract while allowing OS-specific implementation forks.
3. Ensure CI can validate behavior across Linux/macOS/Windows.
4. Preserve existing behavior when recording is disabled or unsupported.

## Non-Goals

- Introducing hard dependency on any single demo TUI (e.g., `k9s`, `gh-dash`).
- Requiring GIF/MP4 generation for test pass/fail.
- Replacing current snapshot and text assertion flow.

## Architecture

### 1) Recording capability layer

Add a new package-level module in `flow-engine` for recording orchestration:

- `RecordingBackend` interface
  - `start(context): Promise<void>`
  - `stop(): Promise<RecordingArtifact[]>`
  - `isSupported(): Promise<CapabilityStatus>`
- `AsciinemaRecorder` implementation
  - Starts/stops recording around session lifecycle
  - Produces `.cast` artifact metadata

`CapabilityStatus` is explicit (`available`, `missing_binary`, `unsupported_os`, `misconfigured`) so callers can degrade predictably.

### 2) Config and schema extension

Extend `run_flow` inputs and flow schema with optional recording block:

```yaml
recording:
  enabled: true
  format: cast        # cast | gif | mp4
  outputPath: snapshots/session_{hash}.cast
  stdin: true
  renderer: auto      # auto | agg | ffmpeg | none
```

For MCP tools (`create_session`, `run_flow`), expose parallel optional fields:

- `recording_enabled`
- `recording_format`
- `recording_output_path`
- `recording_stdin`
- `recording_renderer`

Defaults keep recording disabled to avoid behavioral breakage.

### 3) Artifact model update

Extend artifact union with recording types:

- `cast`
- `gif`
- `mp4`

Each artifact includes:

- `path`
- `format`
- `intent`
- `source` (`snapshot` | `recording` | `render`)

### 4) OS-specific fork strategy (same API)

- **Linux**: primary path supports `asciinema` recording with optional renderer.
- **macOS**: same recording path if dependencies available; fallback to no-record with warning.
- **Windows**: same recording path when available; fallback to no-record with warning.

All OS paths share the same MCP/flow semantics and return shape.

### 5) Dependency and capability checks

Extend `check_system_dependencies` to include recording checks:

- `asciinema`
- optional renderers (`agg`, `ffmpeg`)

Expose installed/missing info and recommended install hints per platform.

### 6) Reliability and cleanup

- Recording lifecycle tied to session lifecycle (`connect`/`disconnect`, flow `run`/`cleanup`).
- Fail-safe stop on uncaught errors and process signals.
- Ensure partial artifacts are either marked invalid or removed.

## File Plan

### New files

- `packages/flow-engine/src/recording/types.ts`
- `packages/flow-engine/src/recording/AsciinemaRecorder.ts`
- `packages/flow-engine/src/recording/RecordingFactory.ts`
- `packages/flow-engine/src/recording/recording.spec.ts`

### Modified files

- `packages/flow-engine/src/schema.ts`
- `packages/flow-engine/src/runner.ts`
- `packages/flow-engine/src/runner.spec.ts`
- `packages/flow-engine/src/index.ts`
- `packages/server/src/index.ts`
- `packages/server/src/dependencies.ts`
- `packages/server/test/mcp-tools.test.ts`
- `README.md`
- `docs/possible-problems.md`

## Task Breakdown (Implementation Order)

1. **Schema first**
   - Add recording schema/types in `flow-engine`.
   - Add tests for schema validation/defaults.

2. **Recorder abstraction**
   - Introduce `RecordingBackend` and `AsciinemaRecorder`.
   - Unit test capability checks and artifact mapping.

3. **Flow runner integration**
   - Start recorder on `spawn` when enabled.
   - Stop recorder on cleanup and append artifacts.
   - Cover success/failure/timeout test paths.

4. **MCP tool integration**
   - Extend `run_flow` and `create_session` schemas with recording flags.
   - Wire response artifacts with recording entries.

5. **Dependency reporting**
   - Extend `check_system_dependencies` output for recording toolchain.

6. **Docs + examples**
   - Add cross-OS usage notes and capability matrix.
   - Document degradation behavior when recorder unavailable.

## Testing Strategy

- **Unit tests (mandatory)**
  - Recording schema defaults and invalid config handling
  - Recorder factory OS selection and unsupported path behavior
  - Artifact typing/serialization

- **Integration tests**
  - `run_flow` with recording enabled emits `.cast` artifact when supported
  - Recorder unavailable returns clear warning but does not break core flow execution
  - Cleanup tests verify no orphaned recorder processes

- **Cross-platform CI matrix**
  - Linux, macOS, Windows runs
  - Recording-enabled tests gated by capability probe
  - Core flow tests always run independent of recording availability

## Risks and Mitigations

1. **Binary availability drift across OS images**
   - Mitigation: capability gate + explicit diagnostics, avoid hard failures by default.

2. **Recorder lifecycle leaks**
   - Mitigation: centralized stop hooks in flow cleanup + process signal handlers.

3. **Flaky rendering conversion (`gif`/`mp4`)**
   - Mitigation: treat conversion as optional post-processing; `.cast` is primary artifact.

## Acceptance Criteria

1. A user can enable recording through MCP tool inputs or flow config.
2. When supported, execution produces valid `.cast` artifacts and reports them.
3. When unsupported, execution continues and returns actionable capability warnings.
4. `check_system_dependencies` reports recording dependencies per OS.
5. Tests pass in CI matrix with no orphaned recorder/session processes.
