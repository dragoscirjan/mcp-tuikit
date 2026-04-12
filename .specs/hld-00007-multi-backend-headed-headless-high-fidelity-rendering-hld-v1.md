---
id: "00007"
type: hld
title: "Multi-Backend Headed/Headless High-Fidelity Rendering HLD"
version: 1
status: draft
parent: "00002"
opencode-agent: lead-engineer
---

# High-Level Design: Multi-Adapter High-Fidelity Terminal Rendering

## 1. Overview
The current `canvas`-based headless renderer will be replaced by a flexible, multi-adapter system. This new architecture prioritizes "Headed" mode—launching native, visible terminal emulators—so users can observe the LLM's actions in real-time. A high-fidelity "Headless" mode will serve as a robust fallback for CI/CD or server environments.

## 2. Core Architecture
The system centers around a persistent PTY/tmux session. Renderers (Adapters) act as viewers attached to this session.

### 2.1 Adapter Interface
All rendering backends implement a unified interface to:
- **Spawn**: Launch the terminal process or browser.
- **Attach**: Connect the viewer to the specific tmux session.
- **Capture**: Retrieve the current visual state as an image (PNG/JPEG) or text grid.
- **Resize**: Adjust the PTY and viewer dimensions.

### 2.2 Sizing Strategy
- **Default Resolution**: Shift from the legacy 80x24 layout to a modern 120 columns by 40 rows.
- **Dynamic Scaling**: Expose tools allowing the LLM to request dimension changes if it detects UI breakage or needs more viewport space.

## 3. Headed Mode (Primary)
The system will attempt to discover and launch modern terminal emulators installed on the host OS.

### Supported Emulators & Spawning
- **WezTerm**: `wezterm cli spawn -- tmux attach -t <session>`
- **Ghostty**: `ghostty -e "tmux attach -t <session>"`
- **Alacritty**: `alacritty -e tmux attach -t <session>`
- **Konsole / GNOME Terminal**: Standard `-- command` flags.
- **iTerm2**: Controlled via AppleScript/JXA to open a new window and execute the attach command.

### Screenshot Generation
Since native terminals don't universally support programmatic frame extraction, we will utilize OS-level window capture utilities:
- **macOS**: `screencapture -l <window_id>` (requires bridging AppleScript/CoreGraphics to get the window ID).
- **Linux**: X11/Wayland utilities like `xdotool` + `maim`, `scrot`, or `grim`.
- **Windows**: Native Win32 API calls or PowerShell scripting to capture specific HWNDs.
These tools may require lightweight C/Rust/Zig native modules compiled alongside the Node.js server.

## 4. Headless Mode (Fallback)
If no supported GUI terminal is available, the system falls back to headless generation.

### Playwright + xterm.js (Preferred Headless)
- Bundles a lightweight HTML file containing `xterm.js`.
- Uses Playwright to download and manage a headless Chromium instance.
- Connects `xterm.js` to the Node.js PTY host via WebSocket.
- Uses Playwright's native `element.screenshot()` to capture pixel-perfect, high-fidelity terminal output.

### Asciinema / agg (Alternative Headless)
- Records the PTY stream to the asciicast format.
- Uses `agg` (Asciinema Gif Generator) to render frames to PNGs or GIFs.

## 5. Implementation Plan & User Stories

The implementation follows a Chain of Responsibility pattern for the Fallback Manager.

- **Story 1: Core PTY & Adapter Foundation**
  Implement the base `TerminalAdapter` interface and the Fallback Manager. Set default dimensions to 120x40 and implement PTY resizing logic.
- **Story 2: Playwright/xterm.js Headless Adapter**
  Build the HTML harness and Playwright automation. This guarantees at least one reliable, high-fidelity renderer works across all platforms immediately.
- **Story 3: macOS Headed Support (WezTerm & iTerm2)**
  Implement spawning logic for WezTerm and iTerm2. Develop the OS-level screenshot mechanism (via Swift/Objective-C module or CLI wrappers) to capture the terminal window.
- **Story 4: Linux Headed Support (Ghostty, Alacritty, GNOME)**
  Implement spawning logic for Linux targets. Integrate X11/Wayland screenshotting fallbacks.
- **Story 5: Fallback Pipeline Integration**
  Wire the Fallback Manager to execute the ordered chain: Try Headed WezTerm -> Try Headed Ghostty -> Try Headed iTerm2 -> Try Headed Alacritty -> Try Headless Playwright.
- **Story 6: LLM Resizing Tools**
  Expose MCP tool endpoints allowing the LLM to inspect current dimensions and request resizes. Ensure all adapters properly handle resize events and re-trigger screenshots.