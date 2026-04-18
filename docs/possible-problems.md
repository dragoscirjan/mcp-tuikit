# Possible Problems / Known Issues

## macOS Snapshotter Brittleness

In `packages/flow-engine/src/snapshotters/macos.ts`, the implementation relies on a hardcoded Swift script (for `CGWindowList`) and AppleScript.

- It relies on an arbitrary `delay(500)` before invoking `screencapture` to wait for the compositor.
- While it has a 3-try retry loop for `screencapture`, timing-based screenshotting is notoriously flaky in CI environments or under heavy CPU load, which could lead to capturing blank frames.

_To be addressed later if issues arise._
