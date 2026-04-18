# LLD: Linux Snapshotter, X11/Wayland Detection, and CLI Fallbacks

## 1. Context and Objective
This document outlines the design for Linux window spawning and snapshotting capabilities in `mcp-tuikit` (Issue #21). The objective is to reliably detect the active display server protocol (X11 vs Wayland), spawn processes, extract window identifiers, and capture screenshots using appropriate tools and fallbacks.

## 2. Architecture & Components

### 2.1 Display Server Detection (Phased Approach)
We require robust detection of the host's display server (X11, Wayland, or headless). To minimize compilation overhead during installation, we use a phased approach.

*   **Phase 1 (Primary - FFI):** Attempt to use **`koffi`** (a fast Node.js FFI library) in pure TypeScript.
    *   **Approach**: Check environment variables (`$WAYLAND_DISPLAY`, `$DISPLAY`). If inconclusive, dynamically load `libwayland-client.so` (attempt `wl_display_connect`) and `libX11.so` (attempt `XOpenDisplay`) via `koffi`. This avoids any C++ native compilation step during `npm install`.
*   **Phase 2 (Fallback - C++ with `cmake-js`):** If the FFI approach proves unviable or unstable during development, we will fallback to creating a `packages/native-linux` C++ module.
    *   **Strict Constraint**: Must strictly use `cmake-js` instead of `node-gyp` for native compilation.

*   **Interface**: Exposes `getDisplayServerProtocol(): 'x11' | 'wayland' | 'unknown'`.

### 2.2 Window Spawner & Identification (`packages/core`)
`LinuxNativeSpawner` implements the `ISpawner` interface. It leverages the FFI detection layer to choose the window ID extraction strategy.
*   **X11 Strategy**: 
    *   Spawns the target process.
    *   Polls `xdotool search --pid <PID>` to retrieve the global Window ID.
    *   Fallback: Use `xprop -root _NET_CLIENT_LIST` and filter by `_NET_WM_PID`.
*   **Wayland Strategy**:
    *   Wayland enforces strict isolation; global Window IDs do not exist for standard clients.
    *   **Approach**: Identify the window by its application ID (`app_id`) and window title.
    *   **Implementation**: Query compositor-specific IPC tools to find window geometry/identifier:
        *   *Sway/i3*: `swaymsg -t get_tree` -> parse JSON for matching PID/app_id.
        *   *Hyprland*: `hyprctl clients -j` -> parse JSON.
        *   *GNOME*: Standard Wayland tools fail here without extensions; fallback to capturing the entire screen or using DBus (`org.gnome.Shell.Screenshot`).

### 2.3 Snapshotting Fallbacks (`packages/terminals`)
`LinuxSnapshotStrategy` implements `ISnapshotStrategy` and executes a chain of CLI tools depending on the display server.

*   **X11 Fallback Chain**:
    1.  `scrot -w <windowId> <output_path>`
    2.  `import -window <windowId> <output_path>` (ImageMagick)
    3.  `maim -i <windowId> <output_path>`
*   **Wayland Fallback Chain**:
    1.  `grim -g "<x>,<y> <w>x<h>" <output_path>` (requires coordinates from the spawner).
    2.  DBus calls to `org.freedesktop.portal.Screenshot` (Interactive, requires user permission, used as absolute last resort).

### 2.4 Integration
*   `SpawnerFactory.ts`: Update to conditionally instantiate `LinuxNativeSpawner` when `process.platform === 'linux'`.
*   `snapshotters/index.ts`: Register `LinuxSnapshotStrategy` for Linux targets.

## 3. Far Future Architecture (Rust Rewrite)
A long-term architectural goal involves rewriting the entire Linux window detection and screenshotting layer in **Rust**.
*   **Tools**: Utilizing crates such as `ashpd` (for FreeDesktop portals), `zbus` (for direct DBus interaction), and `x11rb` (for native X11 interaction).
*   **Benefit**: This would completely eliminate the need for users to manually install fragile CLI dependencies like `scrot`, `xdotool`, `grim`, or `slurp`, offering a seamless and self-contained native experience.

## 4. Edge Cases & Risks
*   **Missing CLI Tools**: The system must gracefully fail and emit a helpful error listing the missing dependencies (e.g., `xdotool`, `scrot`, `grim`).
*   **Wayland Compositor Fragmentation**: `swaymsg` and `hyprctl` are specific. GNOME and KDE require DBus. The spawner must attempt to detect the compositor via `$XDG_CURRENT_DESKTOP` to run the correct coordinate-extraction logic.
*   **Timing**: The application window might not appear immediately after the process is spawned. Both X11 and Wayland strategies require a retry/polling mechanism with a timeout (e.g., 5 seconds).

## 5. Testing Strategy (TDD)
*   Unit tests in Vitest for `LinuxSnapshotStrategy` mocking `child_process.exec`.
*   Integration tests for the `koffi` FFI layer (`getDisplayServerProtocol`).
*   Mock compositor outputs (JSON from `swaymsg` / `hyprctl`) to test Wayland geometry parsing.
