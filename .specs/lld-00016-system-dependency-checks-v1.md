# system-dependency-checks

## Summary
Add a new MCP tool `check_system_dependencies` which inspects the host environment based on the current configuration (`TUIKIT_TERMINAL`, `TUIKIT_HEADLESS`) and verifies if all required dependencies are available. Adapt `VirtualSessionManager` to verify `imagemagick` (specifically `import`) when running headless under `Xvfb` on Linux, resolving Issue #36.

## Architecture
1. **Dependency Checker Module (`packages/server/src/dependencies.ts`)**:
   - `checkDependencies()`: Determines OS, Terminal Backend (e.g. `xterm.js` vs native), and Headless mode.
   - For `xterm.js`, it checks if Playwright browsers are installed.
   - For native terminals, it checks for `tmux`.
   - On Linux, if headless is needed, it checks for `Xvfb` and `import` (ImageMagick) or `sway`/`grim`.
   - Returns a structured result `{ ok: boolean, missing: string[], installed: string[], details: string }`.

2. **MCP Tool (`packages/server/src/index.ts`)**:
   - Expose `check_system_dependencies` tool which invokes the checker and formats the output.

3. **Update Linux Virtual Session (`packages/spawn/src/spawn/linux/VirtualSessionManager.ts`)**:
   - Update `Xvfb` setup to ensure `import` is available, adding `imagemagick` to the suggested install command.

## Files to modify
- `packages/spawn/src/spawn/linux/VirtualSessionManager.ts`
- `packages/server/src/dependencies.ts` (new)
- `packages/server/src/index.ts`
- `packages/server/test/mcp-tools.test.ts`

## Tasks
1. Create `dependencies.ts` in `server` with the dependency checking logic.
2. Modify `index.ts` to register `check_system_dependencies`.
3. Update `VirtualSessionManager.ts` to throw error suggesting `imagemagick` if `import` is missing.
4. Add tests for the new dependency checker and MCP tool.
