---
id: "00013"
type: lld
title: "Linux Snapshotter"
version: 3
status: draft
author: lead-engineer
---

# LLD: Linux Hybrid Snapshotter (Headless + Native)

## Objective

Provide a robust, zero-prompt, zero-GUI screenshot mechanism for Linux (especially Wayland) by introducing a hybrid snapshotter architecture. The primary strategy uses a pure Node.js headless rendering pipeline (`@xterm/headless` -> SVG -> PNG) to eliminate compositor-level security prompts and full-screen noise. The secondary strategy retains the OS-level native screenshot mechanisms (D-Bus, `grim`, `scrot`) for users who explicitly require literal desktop captures.

## Approach

1. **Environment Variable Switch:**
   - Introduce `LINUX_SNAPSHOT_MODE` environment variable.
   - Acceptable values: `headless` (default) and `native`.
   - If unset, it defaults to `headless`.
2. **Headless Strategy (Default):**
   - **Capture:** Use `tmux capture-pane -e` to capture the raw ANSI text stream of the active terminal session.
   - **Render (Memory):** Feed the ANSI stream into a `@xterm/headless` instance running purely in Node.js memory. This builds the terminal grid with accurate colors and formatting.
   - **Export (SVG -> PNG):** Programmatically iterate over the `xterm` buffer to generate an SVG string containing `<rect>` and `<text>` nodes representing the terminal cells. Convert this SVG to a PNG (using `sharp` or `@resvg/resvg-js` if available, or just native buffer parsing) to return to the LLM.
   - *Scope:* This strategy will initially be implemented for Linux only.
3. **Native Strategy (Fallback/Opt-In):**
   - Retain the existing `LinuxSnapshotStrategy` implementation which uses `napi-rs` for display server detection.
   - **Wayland:** Attempt GNOME Shell D-Bus -> KDE `spectacle` -> `grim`.
   - **X11:** Attempt `scrot` -> `maim` -> `import`.

## Interfaces

- **`LinuxSnapshotStrategy`:** Will act as a router based on `process.env.LINUX_SNAPSHOT_MODE`.
- **`HeadlessSnapshotStrategy`:** A new strategy class implementing the `SnapshotStrategy` interface. It will manage the `@xterm/headless` lifecycle and SVG/PNG generation.

## Edge Cases & Risks

- **Font Rendering:** Headless rendering relies on standard monospace character widths. Complex Unicode (ligatures, Powerline symbols) might require fallback fonts or custom SVG `<text>` width handling.
- **Dependency Footprint:** Adding an SVG-to-PNG converter might increase native binding dependencies. We will prefer lightweight, cross-platform WASM/Native converters (like `@resvg/resvg-js`) if needed, ensuring they don't break NixOS/Gentoo builds.
- **Tmux State:** Headless mode relies on `tmux capture-pane`. If the tmux session gets corrupted, the snapshot will fail. We must ensure tmux captures the full visible pane area accurately.

## Tasks for Worker Backend Dev

- **Task 1: Environment Switch in Linux Router**
  - Update `packages/terminals/src/snapshotters/linux.ts`.
  - Check `process.env.LINUX_SNAPSHOT_MODE`. If it equals `native`, execute the existing Wayland/X11 screenshot logic. If it equals `headless` (or is undefined), instantiate and call the new headless snapshotter.
- **Task 2: Headless Snapshot Strategy Implementation**
  - Create `packages/terminals/src/snapshotters/headless.ts`.
  - Implement a `HeadlessSnapshotStrategy` that uses `execa` to run `tmux capture-pane -t <session> -e -p`.
  - Initialize `@xterm/headless` and write the ANSI stream to it.
  - Implement an SVG builder that reads `xterm.buffer.active` and maps the ANSI color palette to SVG elements.
- **Task 3: Integration Tests**
  - Update `test/linux.integration.test.ts` to test both modes.
  - Set `LINUX_SNAPSHOT_MODE=headless` and verify that the test generates an image artifact successfully without requiring external CLI tools.
