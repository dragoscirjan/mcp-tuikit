---
id: "00015"
type: lld
title: "Linux Headless Virtual Sessions"
version: 1
status: draft
opencode-agent: lead-engineer
---

# Linux Headless Virtual Sessions

## Objective
Enable completely silent, programmatic, prompt-free testing and execution of Linux native terminals (Alacritty, WezTerm, Ghostty) by spawning them inside isolated, headless virtual compositors (Xvfb, Sway, KWin). This avoids triggering strict security checks on modern Wayland desktop environments (like GNOME).

## Architecture & Components

### 1. `packages/core/src/spawn/linux/VirtualSessionManager.ts`
A new utility responsible for initializing and terminating headless compositors.
- Checks `TUIKIT_HEADLESS` (defaults to `1` on Linux).
- Detects the host environment using `isX11DisplayServer()`.
- **X11 Host:** Spawns `Xvfb :<random_display> -screen 0 1920x1080x24`.
- **Wayland Host:** Spawns `WLR_BACKENDS=headless sway -c <temp_empty_config>` or `dbus-run-session kwin_wayland --virtual` (configurable/detectable).
- Returns a `VirtualSession` object:
  ```ts
  interface VirtualSession {
    type: 'xvfb' | 'sway' | 'kwin';
    envOverrides: NodeJS.ProcessEnv; // { DISPLAY: ':99' } or { WAYLAND_DISPLAY: 'wayland-1' }
    pid: number;
    kill: () => Promise<void>;
  }
  ```

### 2. `packages/core/src/spawn/linux/LinuxNativeSpawner.ts`
- If `TUIKIT_HEADLESS !== '0'`, requests a `VirtualSession` from `VirtualSessionManager`.
- Spawns the terminal process using the `envOverrides` returned by the virtual session.
- Extends the `spawnResult` to include virtual session metadata so the snapshotter knows how to capture it.
  ```ts
  return {
    pid: terminalProcess.pid,
    windowId: ..., // might be null in Wayland
    virtualSession: { type: 'xvfb', display: ':99' } // Passed to terminals package
  };
  ```
- Ensures the virtual compositor is killed when the terminal process exits or `kill()` is invoked.

### 3. `packages/terminals/src/snapshotters/linux.ts`
- Receives the `spawnResult` containing `virtualSession`.
- If a `virtualSession` exists, it ignores the host Desktop Environment and uses the specialized tool for the virtual session:
  - `xvfb`: Calls `import -window root <outputPath>` (or `scrot` with the overridden `DISPLAY`).
  - `sway`: Calls `grim <outputPath>` (with the overridden `WAYLAND_DISPLAY`).
  - `kwin`: Calls KWin DBus screenshot API (with the overridden DBus session).
- If `virtualSession` is missing (Headed mode), it falls back to the existing host DE logic (GNOME portal, Spectacle, etc.).

## Testing Strategy (Gradual TDD)
- **Unit Tests:** `VirtualSessionManager` spawning/killing logic, ensuring env overrides are properly generated.
- **Integration Tests (`packages/terminals/test/backends.integration.test.ts`):** 
  - Introduce `TUIKIT_HEADLESS_TEST=0|1|all` (defaults to `1`) to control test environments. When `all`, integration tests iterate through both headed and headless configurations to verify both code paths.
  - Use `vitest.skipIf` or custom wrappers to dynamically run/skip Sway vs Xvfb tests based on the CI/host environment's availability of those tools.
  - Assert that a screenshot file is successfully generated in headless mode without hanging for user prompts.

## Rollout Phases
1. Implement `VirtualSessionManager` + `Xvfb` support (covers X11 hosts + servers without GUI).
2. Integrate `Xvfb` into `LinuxNativeSpawner`.
3. Update `LinuxSnapshotStrategy` to handle `Xvfb` captures.
4. Implement `sway` (or `kwin`) support for Wayland hosts.
5. Update `LinuxSnapshotStrategy` for Wayland headless captures.

