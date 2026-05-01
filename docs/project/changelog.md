# Changelog

All notable changes to `mcp-tuikit` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- **Documentation Website:** Initial deployment of the MkDocs Material documentation site.
- **Epic/Story Setup:** Added GitHub issues and technical specifications (`.specs/hld-00014`) for auto-generating reference documentation from TypeScript source files.
- **Isolated Tmux Sockets:** Implemented `session-id`-scoped Unix domain sockets for tmux (`-L ${sessionId}`) to completely eliminate background test runner race conditions.
- **Playwright Host Native Detection:** Added native Chromium/Chrome auto-detection (via `which chromium`, `which google-chrome`) for the `PlaywrightBackend`, resolving `libgbm.so.1` missing dependency issues on OSs like NixOS.

### Fixed

- **Terminal Emulator ENOENT Crashes:** Added `hasBinary()` checks before attempting to spawn natively installed terminal emulators in integration tests to gracefully skip them instead of crashing.
- **Ghostty Argument Interpolation:** Fixed a shell interpolation bug across all native terminals where `${sessionName}` was passed as a literal string to the `-e` flag instead of the evaluated UUID.
- **CI Pipelines:** Removed obsolete `.github/workflows/build-native.yml` workflows that were failing against deleted code directories.

---

### Removed

- **Headless Snapshot Strategy:** Removed the obsolete `LINUX_SNAPSHOT_MODE=headless` environment variable, its underlying `HeadlessSnapshotStrategy`, and the `@xterm/headless` dependency in favor of robust native mechanisms (e.g. `spectacle`, `gnome-screenshot`).
