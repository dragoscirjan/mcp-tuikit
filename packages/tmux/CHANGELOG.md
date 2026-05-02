## @dragoscirjan/mcp-tuikit-tmux [1.0.3](https://github.com/dragoscirjan/mcp-tuikit/compare/@dragoscirjan/mcp-tuikit-tmux@1.0.2...@dragoscirjan/mcp-tuikit-tmux@1.0.3) (2026-05-02)


### Bug Fixes

* resolve tmux crash on linux during session creation ([69b767c](https://github.com/dragoscirjan/mcp-tuikit/commit/69b767c1e8cad335757bcd18ed5846a80e8fc294))


### Dependencies

* **@dragoscirjan/mcp-tuikit-spawn:** upgraded to 1.0.3

## @dragoscirjan/mcp-tuikit-tmux [1.0.2](https://github.com/dragoscirjan/mcp-tuikit/compare/@dragoscirjan/mcp-tuikit-tmux@1.0.1...@dragoscirjan/mcp-tuikit-tmux@1.0.2) (2026-05-01)


### Dependencies

* **@dragoscirjan/mcp-tuikit-spawn:** upgraded to 1.0.2

## @dragoscirjan/mcp-tuikit-tmux [1.0.1](https://github.com/dragoscirjan/mcp-tuikit/compare/@dragoscirjan/mcp-tuikit-tmux@1.0.0...@dragoscirjan/mcp-tuikit-tmux@1.0.1) (2026-05-01)


### Bug Fixes

* **release:** do not commit package.json with semantic-release ([7a38d89](https://github.com/dragoscirjan/mcp-tuikit/commit/7a38d89397bb574b872a27f0dbd8d2310e6039e3))


### Dependencies

* **@dragoscirjan/mcp-tuikit-spawn:** upgraded to 1.0.1

# @dragoscirjan/mcp-tuikit-tmux 1.0.0 (2026-05-01)


### Bug Fixes

* **release:** add publishConfig.access = public to allow scoped publishing ([4d645be](https://github.com/dragoscirjan/mcp-tuikit/commit/4d645be8e88b8f2c3c59f980f7c63fdbc9f84e26))
* resolve integration test flakiness and ANSI chunk truncation ([3625ab9](https://github.com/dragoscirjan/mcp-tuikit/commit/3625ab9db2ae7c9cd5d8bf84e775421652511431))
* solve headless tmux pane resizing for fast executing TUI apps ([b87eea3](https://github.com/dragoscirjan/mcp-tuikit/commit/b87eea34a33856fe5374b22c3ab9170567461e51))
* **terminals:** fix xterm.js DOM rendering race condition and fallback font width ([8fcaac1](https://github.com/dragoscirjan/mcp-tuikit/commit/8fcaac13fae9b25f1107822976228af93d2f80c4))
* **terminals:** replace Playwright polling with tmux -C control mode streaming ([4119c5b](https://github.com/dragoscirjan/mcp-tuikit/commit/4119c5b9dee4c2ee7ffaafb83a89cfdc25628425))
* **terminals:** resolve iTerm2 AppleScript failing to get missing value bounds ([eb72946](https://github.com/dragoscirjan/mcp-tuikit/commit/eb729465b5c6f5505c02e4a1f69c3da6fd4f7d0f))
* **tests:** enforce 80x24 layout for btop flow in xterm.js ([cc5532d](https://github.com/dragoscirjan/mcp-tuikit/commit/cc5532d12030dbbb6656cf5350e6eb70be842696))
* **tests:** include last screen content in wait_for_text TimeoutError ([96548cd](https://github.com/dragoscirjan/mcp-tuikit/commit/96548cd1e886943f83d2a85282a0740cf1d42f8a))


### Features

* **core:** implement unix mcp backend ([ea4e3bd](https://github.com/dragoscirjan/mcp-tuikit/commit/ea4e3bd5508ee617ff20cec2106ba04bb9d66d2d))
* **docs:** scaffold MkDocs documentation and update monorepo namespaces ([cee83f6](https://github.com/dragoscirjan/mcp-tuikit/commit/cee83f6e9f3f7aae65fe8df592697311a7cd0e6d))


### Dependencies

* **@dragoscirjan/mcp-tuikit-spawn:** upgraded to 1.0.0
