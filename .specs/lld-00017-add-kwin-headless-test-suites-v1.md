# add-kwin-headless-test-suites

## Summary
Add `kwin` (`kwin_wayland` + `spectacle`) as a recognized test suite display server configuration across the workspace to ensure KDE Plasma headless modes are correctly tested in CI and local setups, fixing Issue #37.

## Architecture
1. The test setups use a matrix generator for Linux: if headed runs are supported, it also generates headless tests for `Xvfb` and `sway`.
2. Missing from this matrix is `kwin`, which `mcp-tuikit` expressly supports (using `kwin_wayland` for the compositor and `spectacle` for screenshots).
3. We will modify the Linux branch of the matrix definitions in three key test orchestration files to append `kwin`.

## Files to modify
- `packages/server/test/flow.test.ts`
- `packages/server/test/mcp-server.test.ts`
- `packages/terminals/test/backends.test.ts`

## Tasks
1. In `flow.test.ts`, `defineTerminalFlowSuites`, add a suite branch for `displayServer: 'kwin'`. Validate `hasBinary('kwin_wayland') && hasBinary('spectacle')`.
2. In `mcp-server.test.ts`, `defineTerminalServerSuites`, add a similar branch for `displayServer: 'kwin'`.
3. In `backends.test.ts`, `defineTerminalSuites`, add the `kwin` variant.
4. Run `vitest` with a specific test matcher to verify the `kwin` suite successfully registers.
