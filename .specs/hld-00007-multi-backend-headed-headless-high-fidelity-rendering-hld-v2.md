# High-Level Design: Multi-Backend High-Fidelity Rendering (v2)

## Overview
This document outlines the architecture for high-fidelity terminal rendering, supporting both headed (visible window) and headless (background) execution. This version shifts from automated fallback chains to an explicit, configuration-driven approach, separating the concerns of terminal spawning and visual snapshotting.

## Core Principles
1.  **Explicit Configuration over Fallbacks**: The system attempts to launch exactly one configured terminal backend. If it fails, the system errors out rather than cascading through unpredictable alternatives.
2.  **Decoupled Spawning and Snapshotting**: The responsibility of launching a terminal emulator is entirely separate from capturing its visual state. The system uses OS-level snapshotting tools to target and capture the spawned window.
3.  **Sensible Defaults**: The system provides out-of-the-box defaults based on the host operating system if the user provides no explicit configuration.
4.  **Headless Parity**: Headless execution (via Playwright) is treated as a standard backend option, rather than a mandatory fallback.

## Architecture Components

### Configuration Manager
Reads environment variables or configuration files to determine the active terminal backend. It maps the user's request to the supported OS capabilities.

### Terminal Spawner
Responsible for executing the terminal emulator process. It reads the choice from the Configuration Manager and launches the single requested application. 

### OS-Level Snapshotter
An independent component that captures the visual output of a window. Once the Terminal Spawner successfully launches a window, the Snapshotter locates the window handle (via OS-specific APIs) and captures the frame.

## OS Availability and Backends

The system supports the following terminal backends, strictly mapped to OS capabilities:

*   **All Operating Systems (macOS, Linux, Windows)**
    *   Wezterm
    *   Alacritty
    *   Playwright (Headless)
*   **macOS**
    *   Ghostty
    *   iTerm2
*   **Linux**
    *   Ghostty
    *   GNOME Terminal
    *   Konsole
*   **Windows**
    *   Windows Terminal

## Sensible Defaults

If the user does not specify a terminal backend, the Configuration Manager applies the following defaults based on the host environment:

*   **macOS**: iTerm2
*   **Linux**: GNOME Terminal
*   **Windows**: Windows Terminal
*   **CI/CD Environments**: Playwright (Headless)

## Interactions

1.  A request is made to start a terminal session.
2.  The Configuration Manager identifies the target backend (user-defined or OS default).
3.  The Terminal Spawner launches the selected backend process.
4.  If the spawn fails, a clear error is returned to the user immediately.
5.  On success, the OS-Level Snapshotter is given the window identity.
6.  The Snapshotter captures the window state and returns the visual representation.

## Implementation Plan (User Stories)

1.  **Story 1: Explicit Backend Configuration**
    As a user, I can configure a specific terminal backend via environment variables or config files so that the system uses exactly what I specify without guessing.
2.  **Story 2: OS-Specific Sensible Defaults**
    As a user, I want the system to automatically select a sensible default terminal (iTerm2 for Mac, GNOME Terminal for Linux, Windows Terminal for Windows) when I provide no explicit configuration.
3.  **Story 3: Decoupled OS-Level Snapshotter**
    As an architect, I want terminal spawning decoupled from window snapshotting so that any window can be captured using dedicated OS-level tools regardless of how it was launched.
4.  **Story 4: Headless Playwright Option**
    As a developer, I can configure Playwright as a headless backend option equivalent to headed terminals for use in CI/CD or background environments.
5.  **Story 5: Strict Failure Handling**
    As a user, I receive a clear, immediate error if my explicitly configured terminal fails to spawn, rather than experiencing unpredictable fallback behavior.
