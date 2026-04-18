# LLD: Linux Snapshotter, X11/Wayland Detection, and CLI Fallbacks

## 1. Context and Objective

This document outlines the revised design for Linux window spawning and snapshotting capabilities in `mcp-tuikit` (Issue #21). The previous plans involving `koffi` and `cmake-js` have been discarded. The new objective is to utilize a robust, pre-compiled Rust native module for distro-agnostic display server detection, while retaining CLI fallbacks for the initial phase of screenshot capture.

## 2. Architecture & Components

### 2.1 Native Module Architecture (`packages/native-linux`)

We will build a **Rust** native module using **`napi-rs`**. 

*   **Mechanism**: `napi-rs` compiles Rust code into a native Node.js addon (`.node` file). In JavaScript or TypeScript, this addon acts exactly like a standard `require()` or `import` module, bridging the gap between Node.js and Rust effortlessly.
*   **Pre-compiled Binaries (Zero Compilation for Users)**: A critical architectural decision is to use GitHub Actions to pre-compile these Rust binaries for all major Linux targets (e.g., glibc, musl/Alpine, ARM64, and x64). When an end-user runs `npm install`, the correct pre-compiled `.node` binary is simply downloaded. The user *never* needs to have a Rust compiler or build tools installed on their system.

### 2.2 Distro-Agnostic Detection (Pure Rust)

The Rust module is strictly responsible for bulletproof detection of the active display server protocol without relying on fragile dynamic libraries.

*   **X11**: We will use pure-Rust protocol implementations like `x11rb`. This allows the module to communicate directly with the X11 Unix socket, completely eliminating any dependency on `libX11.so`.
*   **Wayland**: We will use pure-Rust Wayland protocol implementations (e.g., `wayland-client` with a pure Rust backend) or fall back to querying environment variables. This avoids any linking to `libwayland-client.so`.
*   **Interface**: The native module exposes a simple, synchronous JavaScript API:
    *   `export function getDisplayServerProtocol(): 'x11' | 'wayland' | 'unknown'`

### 2.3 Current Phase: Window Spawner & CLI Fallbacks (`packages/core` & `packages/terminals`)

For the *immediate* Phase 1 implementation, the actual screenshot capture and window identification will continue to rely on existing CLI fallbacks and Spawner extraction logic, driven by the Rust detection layer.

*   **Window Identification**:
    *   *X11*: Poll `xdotool` or `xprop` to retrieve the global Window ID based on PID.
    *   *Wayland*: Identify windows by application ID and title using compositor-specific IPC tools (`swaymsg`, `hyprctl`, etc.).
*   **Snapshotting**:
    *   *X11*: Fallback chain using `scrot`, `import` (ImageMagick), or `maim`.
    *   *Wayland*: Fallback chain using `grim` (requires coordinates from the spawner).

### 2.4 Future Extension (DBus & Portals)

By establishing this Rust-based `napi-rs` foundation, we pave the way for completely replacing the fragmented CLI fallbacks in the future.

*   **Roadmap**: We will eventually integrate `zbus` (a pure Rust DBus implementation) and `ashpd` (XDG Desktop Portals).
*   **Benefit**: This will allow us to securely request screenshots directly through the Wayland portal ecosystem, completely bypassing distro fragmentation, compositor-specific CLI tools, and `libdbus.so`. The entire screenshot pipeline will become a self-contained, zero-dependency native experience.

## 3. Edge Cases & Risks

*   **Missing CLI Tools (Current Phase)**: Until the pure Rust portals are implemented, the system must gracefully handle missing CLI dependencies (e.g., `xdotool`, `scrot`, `grim`) by emitting clear, actionable errors.
*   **Wayland Compositor Fragmentation**: `swaymsg` and `hyprctl` are highly specific. The spawner must correctly detect the compositor via `$XDG_CURRENT_DESKTOP` to route coordinate-extraction logic.
*   **Binary Distribution**: Ensuring GitHub Actions correctly matrix-builds and publishes the `napi-rs` artifacts for musl vs glibc and ARM64 vs x64 to prevent `npm install` failures on edge-case Linux distributions.

## 4. Testing Strategy (TDD)

*   **Native Module**: Unit tests within the Rust crate to verify X11 socket connectivity and Wayland environment parsing.
*   **TypeScript Layer**: Vitest tests mocking the `getDisplayServerProtocol` output to ensure correct routing between X11 and Wayland Spawner/Snapshotter strategies.
*   **CLI Fallbacks**: Integration tests mocking `child_process.exec` outputs for `swaymsg`, `xdotool`, and `scrot` to validate parsing logic.
