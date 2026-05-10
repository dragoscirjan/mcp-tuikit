# @dragoscirjan/mcp-tuikit-tmux

The core session management wrapper for `mcp-tuikit`.

Every terminal session is wrapped in a native `tmux` instance. This package interacts with the `tmux` CLI to provide:

- Reliable pseudo-terminal (PTY) isolation
- Predictable ANSI plain-text buffer extraction
- Robust keystroke injection without interfering with the host machine's display
