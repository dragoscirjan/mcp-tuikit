# Troubleshooting & Known Issues

`mcp-tuikit` interacts intimately with OS-level window managers, terminal emulators, and compositors. Below are the known limitations and workarounds.

## 1. No Native Headless Mode on Windows and macOS
Currently, there is no true "headless" mode for spawning **native** terminal emulators (like Alacritty, iTerm2, or Windows Terminal) on macOS or Windows. 
- **The Issue**: If an agent spawns a native terminal via `mcp-tuikit`, a physical window will pop up on your screen.
- **The Workaround**: Use the **`xterm.js`** backend. `xterm.js` uses Playwright to render the terminal invisibly in a headless Chromium instance, making it fully silent on macOS and Windows. 
- *(Note: Linux supports true headless native rendering via `Xvfb`, `Sway`, or `kwin`)*.

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

## 5. No Mouse Support
- **The Issue**: There is currently no support for mouse interactions (clicking, dragging, scrolling).
- **The Cause**: Automating mouse inputs accurately across different operating systems, window managers, and both headless/headed modes presents significant technical complexity.
- **The Workaround**: All interactions must be performed using standard keyboard commands (`send_keys` / `type`).

## 6. No Video Recording
- **The Issue**: The toolkit currently only captures static text and PNG snapshots.
- **Future Plans**: Support for recording video of terminal sessions is planned for a future release to allow agents to observe animations and live TUI transitions.
