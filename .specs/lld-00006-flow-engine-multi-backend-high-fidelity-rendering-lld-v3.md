---
id: "00006"
type: lld
title: "Flow Engine & Multi-Backend High-Fidelity Rendering LLD"
version: 3
status: superseded
parent: 00002
opencode-agent: lead-engineer
---

# LLD 00006: Flow Engine Multi-Backend High-Fidelity Rendering (v3)

## Context and Scope

This document outlines the approach for high-fidelity terminal rendering within the flow engine, replacing the previous node-canvas renderer which suffered from truecolor and box-drawing visual artifacts. The new architecture relies on spawning actual terminal emulators and taking OS-level snapshots to guarantee pixel-perfect representation of the terminal UI.

## Architectural Approach

### Configuration and Selection

The system uses a single explicit configuration option to define the terminal backend. There are no fallback chains; the specified or default terminal is used exclusively. If a requested terminal is unavailable, the system reports an error rather than silently degrading.

The default PTY dimensions are strictly 120 columns by 40 rows across all backends.

### Supported Terminals and Operating Systems

The mapping of supported terminal emulators to operating systems is as follows:

* Cross-Platform (All): Wezterm, Alacritty
* macOS and Linux: Ghostty
* Linux strictly: GNOME Terminal, Konsole
* macOS strictly: iTerm2
* Windows strictly: Windows Terminal

### Default Assignments

If no specific backend is configured, the system assigns defaults based on the host operating system:

* macOS: iTerm2
* Linux: GNOME Terminal
* Windows: Windows Terminal
* CI/CD Environments: Playwright (Headless)

### Component Decoupling

The rendering pipeline is decoupled into two primary components:

1. **Terminal Spawner**: Responsible for launching the configured terminal emulator and attaching it to the target tmux session.
2. **OS-Level Snapshotter**: Responsible for capturing the visual output of the spawned terminal window. Tools vary by environment (e.g., screencapture for macOS, xdotool combined with scrot for Linux, Win32 API interactions for Windows, or direct Playwright screenshots for headless modes).

## Edge Cases and Mitigations

* **Window Overlap**: The snapshot mechanism must ensure the target terminal is brought to the foreground before capture to avoid occlusions.
* **Permissions**: OS-level screen capture often requires explicit accessibility or screen recording permissions. The system must gracefully detect missing permissions and alert the user.
* **DPI Scaling**: Different OS scaling factors may affect the captured image size. Snapshotters must account for or normalize high-DPI outputs.

## Implementation Plan

* **Task 1: Configuration Module**: Implement the explicit backend selection logic and OS-specific default assignment.
* **Task 2: Terminal Spawner**: Build the process launcher to start the configured terminal and attach it to the target tmux session with 120x40 dimensions.
* **Task 3: macOS Snapshotter**: Implement the window focusing and capturing logic using macOS native utilities.
* **Task 4: Linux Snapshotter**: Implement X11/Wayland compatible window focusing and capturing using established Linux utilities.
* **Task 5: Windows Snapshotter**: Implement window targeting and capturing using Windows native APIs.
* **Task 6: Playwright Headless Backend**: Integrate Playwright as a headless backend option for CI/CD environments.
* **Task 7: Pipeline Integration**: Wire the Spawner and Snapshotter into the existing flow engine lifecycle, fully deprecating the legacy canvas renderer.
