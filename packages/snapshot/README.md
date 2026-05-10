# @dragoscirjan/mcp-tuikit-snapshot

Cross-platform screen capture strategies for `mcp-tuikit`. This package abstracts the complexities of taking visual PNG snapshots across different operating systems:

- **macOS**: Utilizes built-in `screencapture` and `osascript`
- **Linux**: Integrates with `grim` for Wayland or other compositor tools
- **Headless**: Wraps Playwright for `xterm.js` browser-based captures
