# LLD: Linux Snapshotter, X11/Wayland Detection, and CLI Fallbacks

## 1. Context and Objective
This document outlines the design for Linux window spawning and snapshotting capabilities in `mcp-tuikit` (Issue #21). The objective is to reliably detect the active display server protocol (X11 vs Wayland), spawn processes, extract window identifiers, and capture screenshots using appropriate CLI fallbacks.

## 2. Architecture & Components

### 2.1 Native Display Server Detection (`packages/native-linux`)
A new native Node.js addon written in C++ using `node-addon-api` and compiled via `node-gyp`.
*   **Purpose**: Definitively detect if the host is running under X11, Wayland, or headless.
*   **Approach**:
    1. Check environment variables (`$WAYLAND_DISPLAY`, `$DISPLAY`).
    2. Fallback to programmatic probing: attempt `wl_display_connect(NULL)` (requires `libwayland-client`) and `XOpenDisplay(NULL)` (requires `libX11`).
*   **Interface**: Exposes a single function `getDisplayServerProtocol(): 'x11' | 'wayland' | 'unknown'`.

### 2.2 Window Spawner & Identification (`packages/core`)
`LinuxNativeSpawner` implements the `ISpawner` interface. It leverages the native detection module to choose the window ID extraction strategy.
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

## 3. Edge Cases & Risks
*   **Missing CLI Tools**: The system must gracefully fail and emit a helpful error listing the missing dependencies (e.g., `xdotool`, `scrot`, `grim`).
*   **Wayland Compositor Fragmentation**: `swaymsg` and `hyprctl` are specific. GNOME and KDE require DBus. The spawner must attempt to detect the compositor via `$XDG_CURRENT_DESKTOP` to run the correct coordinate-extraction logic.
*   **Timing**: The application window might not appear immediately after the process is spawned. Both X11 and Wayland strategies require a retry/polling mechanism with a timeout (e.g., 5 seconds) when querying for the window ID or geometry.

## 4. Testing Strategy (TDD)
*   Unit tests in Vitest for `LinuxSnapshotStrategy` mocking `child_process.exec`.
*   Integration tests for the C++ native addon (`getDisplayServerProtocol`).
*   Mock compositor outputs (JSON from `swaymsg` / `hyprctl`) to test Wayland geometry parsing.