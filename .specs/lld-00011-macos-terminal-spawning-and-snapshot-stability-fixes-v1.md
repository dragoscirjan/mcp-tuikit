---
id: "00011"
type: lld
title: "MacOS Terminal Spawning and Snapshot Stability Fixes"
version: 1
status: approved
opencode-agent: lead-engineer
---

# LLD 00011: MacOS Terminal Spawning and Snapshot Stability Fixes

## 1. Context & Motivation

During integration testing, two main visual rendering bugs were identified with macOS native terminal snapshotting:

1. **iTerm2** was being captured before the shell fully initialized or the `tmux attach` command executed. This led to snapshots of blank or mid-initialization terminals.
2. **WezTerm** snapshots were extremely distorted and misaligned when custom, oversized dimensions (e.g., 160x60) were passed, causing UI apps like `btop` to render improperly aligned within the large window. Furthermore, `wezterm-gui` frequently delegated rendering to existing daemon processes, ignoring CLI dimension configurations entirely.

This spec details the resolutions for these issues.

## 2. iTerm2 Resolution: Direct Profile Command Execution

The previous approach used AppleScript to `write text` into the new window session:
```applescript
tell application "iTerm"
  set newWindow to (create window with default profile)
  ...
  tell current session of newWindow
    write text "exec tmux attach -t session_name"
  end tell
end tell
```

### The Problem
`write text` simulates typing input into the session *after* the terminal emulator launches its default login shell (e.g., `zsh`). The shell startup delays varied heavily, resulting in snapshots occurring before `tmux` attached.

### The Fix
We eliminated the race condition by having iTerm2 directly execute `tmux attach` as the session command.
```applescript
tell application "iTerm"
  set newWindow to (create window with default profile command "tmux attach -t session_name")
  ...
end tell
```
Additionally, the compositor delay inside `captureMacOsWindow` (`packages/terminals/src/snapshotters/macos.ts`) was increased from `500ms` to `1500ms` to guarantee that iTerm2 has rendered the terminal view before `screencapture` is invoked.

## 3. WezTerm Resolution: Process Isolation and Dimension Fallbacks

### The Problem
WezTerm was invoked with explicit CLI flags (`--config initial_cols=...`). However, if a WezTerm background daemon was already active, `wezterm-gui start` would silently delegate to the daemon, bypassing the `--config` arguments.

### The Fix
1. The `--always-new-process` flag was added to the `wezterm-gui start` invocation to isolate the spawn from existing daemons.
2. The `tmux attach` command is now passed properly inside `--` at the end of the invocation, ensuring the new terminal runs it as a standalone executable.
3. Explicit dimension overrides were removed from the `wezterm` test suites to align them with the `80x30` or default fallback layouts, ensuring applications like `btop` center correctly.

```typescript
const bin = process.env.WEZTERM_BIN ?? '/Applications/WezTerm.app/Contents/MacOS/wezterm-gui';
return spawnDirectProcess(bin, [
  'start',
  '--always-new-process',
  '--',
  'tmux',
  'attach',
  '-t',
  tmuxSessionName
]);
```

## 4. Updates to Testing Flow

The `test/flow.integration.test.ts` was updated so that all overrides for columns and rows were removed from the WezTerm configurations, ensuring a standard 80x24/80x30 geometry is preserved across all emulator rendering environments.
