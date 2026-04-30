import os

INDEX_MD = """# mcp-tuikit

**mcp-tuikit** is a powerful [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that enables AI agents to orchestrate, interact with, and monitor Text User Interfaces (TUIs) and headless terminal applications.

**🚀 Fully Cross-OS Compatible**  
Designed from the ground up to run seamlessly on **macOS**, **Linux**, and **Windows**. It bridges the gap between LLMs and native terminal environments, allowing agents to "see" (via PNGs and text) and "type" (via keystrokes) across any operating system.

## What Does It Do?

- **Spawn & Orchestrate:** Launch complex terminal applications (`nvim`, `htop`, `git`, or standard shells) using backends like `tmux`, `xterm.js`, or native emulators (Alacritty, WezTerm, iTerm2, etc.).
- **Capture State:** Take accurate textual representations and pixel-perfect visual PNG screenshots of running terminal apps.
- **Headless Execution:** Run terminal sessions invisibly in CI environments (via `Xvfb` or `Sway` on Linux, or `xterm.js` everywhere) without interrupting the user's workflow.
- **Flow Engine:** Execute pre-defined, step-by-step TUI interaction scripts (YAML-based) for testing or autonomous agent tasks.

## Why mcp-tuikit?

Traditionally, giving an AI agent access to a terminal means piping raw `stdout`/`stderr`. This fails spectacularly for curses-based applications (like `vim` or `fzf`) that rely on complex ANSI escape sequences and screen redrawing.

`mcp-tuikit` solves this by running an actual PTY (pseudo-terminal) backed by `tmux` and rendering it to the agent either as a clean text grid or a visual screenshot. The agent sees exactly what a human would see.

---

## Next Steps

- **[Installation & Dependencies](getting-started/installation.md)**: Learn how to set up `mcp-tuikit` on your OS.
- **[Configuration](getting-started/configuration.md)**: Connect the server to Claude Desktop, Cursor, or other agents.
- **[Troubleshooting & Known Issues](possible-problems.md)**: Check platform limitations and edge cases.
"""

INSTALLATION_MD = """# Installation & Dependencies

Because `mcp-tuikit` orchestrates native terminal emulators and captures screenshots, it requires specific system-level dependencies depending on your operating system.

## 1. Core Dependencies

### **tmux (Required)**
`tmux` is the backbone of `mcp-tuikit` for session management and PTY creation. It must be installed on your system.

=== "macOS"
    ```bash
    brew install tmux
    ```

=== "Linux (Ubuntu/Debian)"
    ```bash
    sudo apt install tmux
    # or
    sudo dnf install tmux
    ```

=== "Windows"
    Windows support relies on a native Win32 port of tmux. Do **not** use MSYS2 or WSL tmux if running the MCP natively on Windows.
    ```powershell
    winget install arndawg.tmux-windows
    ```

---

## 2. Platform-Specific Dependencies

Depending on whether you want native terminal rendering or headless Playwright rendering, you'll need the following:

### macOS
macOS relies on built-in tools (`osascript`, `screencapture`, `CGWindowList`) to capture native terminal windows (iTerm2, Terminal.app, Ghostty, Alacritty, WezTerm, Kitty).
- **No extra tools required** beyond the terminal emulators themselves.

### Linux
To run **headless native terminals**, Linux requires a virtual compositor or X server.
- **Wayland (Native):** Requires `sway` (compositor) and `grim` (screenshot tool).
- **X11 (Legacy):** Requires `Xvfb` (virtual framebuffer) and `x11-apps`.

```bash
# Ubuntu/Debian example for headless dependencies
sudo apt install xvfb sway grim
```

### Windows
Windows relies on native APIs for standard process spawning (`cmd`, `powershell`, `Windows Terminal`).
- **No extra tools required** beyond the native terminal apps.

---

## 3. Installing the MCP Server

You can run `mcp-tuikit` directly via `npx` (which handles fetching the latest Node.js dependencies):

```bash
npx -y @dragoscirjan/mcp-tuikit
```

*(Note: Playwright is used internally for the `xterm.js` backend and will automatically download its Chromium binary on first run).*
"""

KNOWN_ISSUES_MD = """# Troubleshooting & Known Issues

`mcp-tuikit` interacts intimately with OS-level window managers, terminal emulators, and compositors. Below are the known limitations and workarounds.

## 1. No Native Headless Mode on Windows and macOS
Currently, there is no true "headless" mode for spawning **native** terminal emulators (like Alacritty, iTerm2, or Windows Terminal) on macOS or Windows. 
- **The Issue**: If an agent spawns a native terminal via `mcp-tuikit`, a physical window will pop up on your screen.
- **The Workaround**: Use the **`xterm.js`** backend. `xterm.js` uses Playwright to render the terminal invisibly in a headless Chromium instance, making it fully silent on macOS and Windows. 
- *(Note: Linux supports true headless native rendering via `Xvfb` or `Sway`)*.

## 2. WezTerm Black Screen on Headless Linux (Sway)
- **The Issue**: When running WezTerm in a headless Wayland environment (`sway`), the visual PNG snapshots are completely black. The text snapshots still work.
- **The Cause**: WezTerm strongly requires a hardware-accelerated GPU context (Vulkan/OpenGL). In CI environments using `sway` with software rendering (`WLR_RENDERER=pixman`), the buffer is empty.
- **The Workaround**: Force WezTerm into software rendering (`front_end = "Software"` in its config), or use a different terminal emulator (like Alacritty or xterm.js) for Linux CI tests.

## 3. macOS Snapshotter Brittleness
- **The Issue**: Native window screenshots on macOS (using Swift `CGWindowList` and `screencapture`) rely on a hardcoded 500ms delay to allow the macOS compositor to paint the window before taking the shot.
- **The Cause**: Timing-based screenshots are flaky under heavy CPU load.
- **The Workaround**: If you receive black/blank frames on macOS, ensure your CPU isn't heavily throttled, or switch to the `xterm.js` backend which guarantees rendering synchronization via Playwright.

## 4. Tmux Version Requirements
- **The Issue**: `mcp-tuikit` relies on newer `tmux` flags (like `-e` for environment variables and specific socket commands).
- **The Fix**: Ensure your `tmux` version is at least **3.3a+** (3.5a+ is heavily recommended, and required for Windows).
"""

with open("docs/index.md", "w") as f:
    f.write(INDEX_MD)

with open("docs/getting-started/installation.md", "w") as f:
    f.write(INSTALLATION_MD)

with open("docs/possible-problems.md", "w") as f:
    f.write(KNOWN_ISSUES_MD)

