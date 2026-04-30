# Installation & Dependencies

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
- **Wayland (Native):** Requires a Wayland compositor like `sway` (along with `grim` for screenshots) or KDE`s `kwin` (`kwin_wayland`).
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
