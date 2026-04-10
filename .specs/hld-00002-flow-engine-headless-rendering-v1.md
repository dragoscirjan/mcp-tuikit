---
id: "00002"
version: 1
type: hld
parent: "4"
author: tech-advisor
---

# High-Level Design: Flow Engine & Headless Rendering

## 1. Overview
This document outlines the architecture for the **Flow Engine** and **Headless Rendering** system within `mcp-tuikit`. These components enable deterministic, scriptable interactions with Terminal User Interfaces (TUIs) and high-fidelity snapshotting of the resulting terminal states into images (PNG).

## 2. Flow Engine (YAML Scripting)
The Flow Engine executes predefined sequences of terminal interactions. It ensures deterministic execution for testing, automation, and documentation generation.

### 2.1 YAML Schema Definition
The engine consumes YAML files defining `actions`. Each action simulates user input or controls execution flow. The schema is strictly typed and validated using **Zod** (`z.infer<typeof FlowSchema>`).

```yaml
name: "FlowName"
description: "Description of the flow"
env:
  TERM: "xterm-256color"
  COLORTERM: "truecolor"
steps:
  - action: "spawn"
    command: "htop"
    args: ["-d", "10"]
    
  - action: "wait_for"
    type: "text" # or 'regex', 'time'
    value: "Tasks:"
    timeout_ms: 5000

  - action: "type"
    text: "q"
    delay_ms: 100 # Optional delay between keystrokes

  - action: "send_key"
    key: "F10" # Distinct from literal typing for control keys
    
  - action: "snapshot"
    output_dir: "screenshots" # Saves PNG, TXT, and JSON with timestamp/hash
    name_prefix: "htop_quit"
```

### 2.2 Execution Model
- **Runner:** A Node.js class parsing the YAML and orchestrating a PTY (via `node-pty`). Uses `yaml` or `js-yaml` for parsing.
- **State Machine:** Maintains explicit states (`INIT`, `SPAWNING`, `EXECUTING_STEP`, `AWAITING_OUTPUT`, `COMPLETED`, `ERROR`).
- **Non-blocking Execution:** Iterates through steps using `async for...of`. 
  - `delay_ms` uses a promise-based sleep (`await new Promise(r => setTimeout(r, ms))`).
  - `wait_for` attaches a listener to the PTY `onData` event, wrapped in a Promise that resolves on match or rejects on `timeout_ms`. This maps properly to the `TerminalBackend` interface without blocking the Node.js event loop.

## 3. Headless Rendering System
The rendering system converts the ANSI terminal buffer state into a high-fidelity PNG image.

### 3.1 Toolchain Selection
**Decision:** Lightweight Native Rendering (e.g., `node-canvas` reading ANSI directly or `xterm-headless` with a Canvas backend).

*Rationale:* 
While `Playwright` + `xterm.js` offers perfect fidelity, it is too heavy for a lightweight MCP server (large binary downloads, complex OS-level dependencies, significant startup latency). A native canvas-based approach drastically reduces the installation footprint and improves execution speed.

### 3.2 Rendering Pipeline
1. **Capture:** The Flow Engine captures the raw output stream from the PTY.
2. **Setup:** Initialize the lightweight canvas renderer (`node-canvas` or `xterm-headless`).
3. **Replay:** Write the captured ANSI stream into the renderer.
4. **Snapshot Artifacts:** Export the final canvas state as a PNG buffer. Simultaneously export the plain text buffer (`.txt`) and parsed JSON state (`.json`).
5. **Storage:** Save all three artifacts to the requested `output_dir`. Automatically append an ISO-8601 timestamp or unique hash to the filenames to differentiate multiple captures within the same flow (e.g., `screenshots/htop_quit_20260410T210000Z.png`).

### 3.3 Custom Fonts (Nerd Fonts) & Powerline Glyphs
TUIs heavily rely on Nerd Fonts for glyphs and ligatures. Handling these correctly is critical for visual fidelity.

1. **Asset Management:** Packaged Nerd Font (e.g., `MesloLGS NF` or `FiraCode Nerd Font`) is loaded by the canvas backend.
2. **Ligatures & Powerline:** To support ligatures (e.g., `===`, `=>`) and avoid 1px gaps between powerline glyphs, the renderer must explicitly support ligature rendering (if using `xterm-headless`, via an addon or custom handling). If powerline gaps occur due to strict cell bounding boxes, adjustments to `lineHeight` (e.g., `1.05`) or custom glyph handling may be required.
3. **Load Verification:** Ensure the font is fully loaded and registered with the canvas backend *before* initializing the terminal grid or writing any ANSI data, as cell dimensions are calculated on initialization.

## 4. Boundaries & Constraints
* **Flow Engine:** Unaware of rendering. It only manages PTY lifecycle, I/O streams, and flow control via async/await Promises.
* **Headless Renderer:** Stateless. Consumes raw ANSI strings and configuration (dimensions, theme) to produce binaries.
* **Security:** Command execution via `spawn` must be sanitized. Consider using Zod to restrict the `spawn` command to a safe allowlist if inputs are user-provided.
