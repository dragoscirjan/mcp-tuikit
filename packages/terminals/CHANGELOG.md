## @dragoscirjan/mcp-tuikit-terminals [1.0.3](https://github.com/dragoscirjan/mcp-tuikit/compare/@dragoscirjan/mcp-tuikit-terminals@1.0.2...@dragoscirjan/mcp-tuikit-terminals@1.0.3) (2026-05-01)


### Dependencies

* **@dragoscirjan/mcp-tuikit-snapshot:** upgraded to 1.0.3
* **@dragoscirjan/mcp-tuikit-spawn:** upgraded to 1.0.2
* **@dragoscirjan/mcp-tuikit-tmux:** upgraded to 1.0.2
* **@dragoscirjan/mcp-tuikit-test:** upgraded to 1.0.2

## @dragoscirjan/mcp-tuikit-terminals [1.0.2](https://github.com/dragoscirjan/mcp-tuikit/compare/@dragoscirjan/mcp-tuikit-terminals@1.0.1...@dragoscirjan/mcp-tuikit-terminals@1.0.2) (2026-05-01)


### Dependencies

* **@dragoscirjan/mcp-tuikit-snapshot:** upgraded to 1.0.2
* **@dragoscirjan/mcp-tuikit-spawn:** upgraded to 1.0.2
* **@dragoscirjan/mcp-tuikit-tmux:** upgraded to 1.0.2
* **@dragoscirjan/mcp-tuikit-test:** upgraded to 1.0.2

## @dragoscirjan/mcp-tuikit-terminals [1.0.1](https://github.com/dragoscirjan/mcp-tuikit/compare/@dragoscirjan/mcp-tuikit-terminals@1.0.0...@dragoscirjan/mcp-tuikit-terminals@1.0.1) (2026-05-01)


### Bug Fixes

* **release:** do not commit package.json with semantic-release ([7a38d89](https://github.com/dragoscirjan/mcp-tuikit/commit/7a38d89397bb574b872a27f0dbd8d2310e6039e3))


### Dependencies

* **@dragoscirjan/mcp-tuikit-snapshot:** upgraded to 1.0.1
* **@dragoscirjan/mcp-tuikit-spawn:** upgraded to 1.0.1
* **@dragoscirjan/mcp-tuikit-tmux:** upgraded to 1.0.1
* **@dragoscirjan/mcp-tuikit-test:** upgraded to 1.0.1

# @dragoscirjan/mcp-tuikit-terminals 1.0.0 (2026-05-01)


### Bug Fixes

* **release:** add publishConfig.access = public to allow scoped publishing ([4d645be](https://github.com/dragoscirjan/mcp-tuikit/commit/4d645be8e88b8f2c3c59f980f7c63fdbc9f84e26))
* resolve integration test flakiness and ANSI chunk truncation ([3625ab9](https://github.com/dragoscirjan/mcp-tuikit/commit/3625ab9db2ae7c9cd5d8bf84e775421652511431))
* **terminals:** add full 256/RGB color support to headless svg renderer ([40e17be](https://github.com/dragoscirjan/mcp-tuikit/commit/40e17be9d7c881ab744c882c0fb2d075210f583a))
* **terminals:** add real-time polling to PlaywrightBackend ([af541e7](https://github.com/dragoscirjan/mcp-tuikit/commit/af541e7ed28fd9d546e14266ad789fba75e0b62e))
* **terminals:** execute tmux directly in Ghostty bypassing hardcoded /bin/bash ([c6821a3](https://github.com/dragoscirjan/mcp-tuikit/commit/c6821a3773c050fa6319cddceb3a3541a283d6eb))
* **terminals:** fix xterm.js DOM rendering race condition and fallback font width ([8fcaac1](https://github.com/dragoscirjan/mcp-tuikit/commit/8fcaac13fae9b25f1107822976228af93d2f80c4))
* **terminals:** normalize initial tmux pane dump to fix rendering in headed browser ([4609f4d](https://github.com/dragoscirjan/mcp-tuikit/commit/4609f4de1d106a31eab831b42c2bb3485dfb789a))
* **terminals:** replace Playwright polling with tmux -C control mode streaming ([4119c5b](https://github.com/dragoscirjan/mcp-tuikit/commit/4119c5b9dee4c2ee7ffaafb83a89cfdc25628425))
* **terminals:** resolve iTerm2 AppleScript failing to get missing value bounds ([eb72946](https://github.com/dragoscirjan/mcp-tuikit/commit/eb729465b5c6f5505c02e4a1f69c3da6fd4f7d0f))
* **test:** configure wezterm rows and match txt exactly ([d03f0a3](https://github.com/dragoscirjan/mcp-tuikit/commit/d03f0a30d165cf38a380d678c379b23cfee3db99))
* **tests:** include last screen content in wait_for_text TimeoutError ([96548cd](https://github.com/dragoscirjan/mcp-tuikit/commit/96548cd1e886943f83d2a85282a0740cf1d42f8a))


### Features

* **docs:** scaffold MkDocs documentation and update monorepo namespaces ([cee83f6](https://github.com/dragoscirjan/mcp-tuikit/commit/cee83f6e9f3f7aae65fe8df592697311a7cd0e6d))
* implement linux native display server detection and spawner fallback chain ([d5c6d9a](https://github.com/dragoscirjan/mcp-tuikit/commit/d5c6d9a4f379119ae7ebb35f94b3ffe51014c4f3))
* implement pure Node.js DBus screenshots for GNOME and native fallback for KDE ([c8c224e](https://github.com/dragoscirjan/mcp-tuikit/commit/c8c224e70449987bc11599176029b6cedae0bfbc))
* **terminals:** add Kitty backend ([e1d128a](https://github.com/dragoscirjan/mcp-tuikit/commit/e1d128a8688ce44def91afd6181c1b8d4ba598a4))
* **terminals:** add Konsole and GNOME Terminal backends ([4c02655](https://github.com/dragoscirjan/mcp-tuikit/commit/4c026553fabe94f32e65066391d63b7f8b010c3f))
* **terminals:** bundle SauceCodePro Nerd Font for xterm.js rendering ([08fb667](https://github.com/dragoscirjan/mcp-tuikit/commit/08fb667f7bb58ff8979e00603ad266f965a50ecc))
* **terminals:** launch playwright browser persistently in PlaywrightBackend to act as a true headed window ([ac78eef](https://github.com/dragoscirjan/mcp-tuikit/commit/ac78eefdcb8b8a8ac3b5e202924ddc1c58042f2f))
* use DE-specific tools for native active-window screenshots ([19e95b5](https://github.com/dragoscirjan/mcp-tuikit/commit/19e95b5114bcb08132d5761fc04cdff86f97eb9e))


### Dependencies

* **@dragoscirjan/mcp-tuikit-snapshot:** upgraded to 1.0.0
* **@dragoscirjan/mcp-tuikit-spawn:** upgraded to 1.0.0
* **@dragoscirjan/mcp-tuikit-tmux:** upgraded to 1.0.0
* **@dragoscirjan/mcp-tuikit-test:** upgraded to 1.0.0
