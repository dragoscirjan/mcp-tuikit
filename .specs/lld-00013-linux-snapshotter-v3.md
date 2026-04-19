---
id: "00013"
type: lld
title: "Linux Snapshotter"
version: 4
status: obsolete
author: lead-engineer
---

# LLD: Linux Hybrid Snapshotter (Headless + Native)

## Objective

Provide a robust, zero-prompt, zero-GUI screenshot mechanism for Linux.
*Update: The headless approach and the LINUX_SNAPSHOT_MODE environment variable have been removed since we got stuck to the native variant, using spectacle and the other gnome stuff.*

## Approach

1. **Native Strategy (Default):**
   - Retain the existing `LinuxSnapshotStrategy` implementation which uses `napi-rs` for display server detection.
   - **Wayland:** Attempt GNOME Shell D-Bus -> KDE `spectacle` -> `grim`.
   - **X11:** Attempt `scrot` -> `maim` -> `import`.

## Interfaces

- **`LinuxSnapshotStrategy`:** Will act as the snapshotter.

## Edge Cases & Risks

- **Dependency Footprint:** Adding an SVG-to-PNG converter might increase native binding dependencies. We will prefer lightweight, cross-platform WASM/Native converters (like `@resvg/resvg-js`) if needed, ensuring they don't break NixOS/Gentoo builds.

## Tasks for Worker Backend Dev

- **Task 1: Environment Switch in Linux Router**
  - Update `packages/terminals/src/snapshotters/linux.ts`.
  - Check `process.env.LINUX_SNAPSHOT_MODE`. If it equals `native`, execute the existing Wayland/X11 screenshot logic. If it equals `headless` (or is undefined), instantiate and call the new headless snapshotter. (OBSOLETE)
- **Task 2: Headless Snapshot Strategy Implementation**
  - Create `packages/terminals/src/snapshotters/headless.ts`. (OBSOLETE)
- **Task 3: Integration Tests**
  - Update `test/linux.integration.test.ts` to test both modes. (OBSOLETE)
