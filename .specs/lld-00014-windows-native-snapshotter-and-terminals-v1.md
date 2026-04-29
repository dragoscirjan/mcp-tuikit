---
id: "00014"
type: lld
title: "Windows Native Snapshotter and Terminals"
version: 1
status: draft
opencode-agent: lead-engineer
---

# Windows Native Snapshotter and Terminals

## 1. Overview

This LLD outlines the implementation of native terminal spawning and snapshotting for Windows, addressing Issue #22. It covers adding Windows support to `AppSpawner`, implementing a robust `WindowsSnapshotStrategy`, and integrating specific Windows terminal emulators.

The core challenge with Windows terminals (WezTerm, Alacritty, Windows Terminal) is that they use hardware-accelerated rendering (OpenGL/DirectX). Capturing these reliably via standard Win32 `PrintWindow` often yields black screens. The most robust zero-dependency method is bringing the window to the absolute foreground and capturing its desktop bounding box using `.NET`'s `System.Drawing.Graphics.CopyFromScreen`, executed via PowerShell.

## 2. Requirements

1. **Terminal Support**: Implement/update backends and spawner logic for:
   - `Windows Terminal` (`wt.exe`)
   - `Alacritty`
   - `WezTerm`
   - `PowerShell` (default `powershell.exe`)
   - `CMD` (default `cmd.exe`)
2. **Snapshotting**: Capture the terminal window reliably without external dependencies (no `node-gyp` or native modules).
3. **Cross-Platform Integration**: Ensure `BackendFactory` and `SnapshotStrategy` correctly route to Windows implementations when `process.platform === 'win32'`.

## 3. Architecture Changes

### 3.1. Windows Spawner (`packages/spawn/src/spawn/windows/WindowsNativeSpawner.ts`)

A new spawner for Windows that utilizes `child_process.spawn`. It will handle identifying the executable and launching it detached. 
Unlike macOS which uses `open`, Windows can launch the `.exe` directly.

- It will poll for the `windowId` (HWND) if `requireWindowId` is true, using a PowerShell script to find the PID or title.
- For `wt.exe`, since it delegates to a main `WindowsTerminal.exe` process, we need specific logic to find the active terminal window.

### 3.2. New Terminal Backends (`packages/terminals/src/backends/`)

- `WindowsTerminalBackend.ts`: Spawns `wt.exe` and sets up the session.
- `PowershellBackend.ts`: Spawns `powershell.exe`.
- `CmdBackend.ts`: Spawns `cmd.exe`.
- Ensure `AlacrittyBackend.ts` and `WezTermBackend.ts` use the correct executable names on Windows (`alacritty.exe`, `wezterm-gui.exe`).

### 3.3. Windows Snapshotter (`packages/terminals/src/snapshotters/windows.ts`)

The project already uses Playwright + `xterm.js` for headless rendering. This is fully supported on Windows. 
When `backendConfig === 'xterm.js'` or `backendConfig === 'playwright'`, the existing `PlaywrightBackend` and `PlaywrightSnapshotStrategy` will be used. This allows for fast, headless, purely text-based (ANSI to HTML) snapshots on Windows without needing to spawn a visible GUI window or use PowerShell screenshotting.

The logic in `packages/terminals/src/snapshotters/index.ts` will continue to route `xterm.js` to Playwright first, and only fall back to the native `WindowsSnapshotStrategy` for actual GUI terminals (Alacritty, Windows Terminal, WezTerm, etc.).

Implements `SnapshotStrategy`. The core of this is a PowerShell script executed via `execAsync` that:
1. Loads `user32.dll` via `Add-Type`.
2. Locates the window by HWND (if provided) or process name/title.
3. Brings the window to the foreground (`SetForegroundWindow`, `ShowWindow`).
4. Sleeps briefly (~200-300ms) to allow the compositor to draw the window.
5. Uses `GetWindowRect` to find the exact coordinates.
6. Uses `System.Drawing.Graphics.CopyFromScreen` to capture the region.
7. Saves the `System.Drawing.Bitmap` as a PNG to the `outputPath`.

To maintain clean separation of concerns and avoid inline string escaping nightmares, the PowerShell script will be placed in a dedicated static file (`packages/terminals/src/snapshotters/capture_windows.ps1`). The snapshotter class will resolve the file path at runtime and execute it.

By using `CopyFromScreen`, we bypass the hardware acceleration restrictions of `PrintWindow`, guaranteeing that Alacritty, WezTerm, and Windows Terminal are captured exactly as the user sees them.

## 4. Implementation Details

### 4.1. PowerShell Capture Script (`packages/terminals/src/snapshotters/capture_windows.ps1`)

The logic will reside in a static script file passed to `powershell.exe`.

```powershell
param (
    [string]$TargetWindowId,
    [string]$TargetProcessName,
    [string]$OutputPath
)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
}
"@
Add-Type -AssemblyName System.Drawing

# Determine HWND...
# (Logic to parse passed TargetWindowId or find by TargetProcessName)

[Win32]::ShowWindow($hwnd, 9) # SW_RESTORE
[Win32]::SetForegroundWindow($hwnd)
Start-Sleep -Milliseconds 300 # Allow paint

[Win32]::RECT rect;
[Win32]::GetWindowRect($hwnd, [ref]rect)

$width = rect.Right - rect.Left
$height = rect.Bottom - rect.Top

$bitmap = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bitmap.Size)
$bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
```

In `packages/terminals/src/snapshotters/windows.ts`, we will construct the command dynamically:
```typescript
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { execa } from 'execa';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(currentDir, 'capture_windows.ps1');

await execa('powershell.exe', [
  '-ExecutionPolicy', 'Bypass',
  '-File', scriptPath,
  '-TargetWindowId', windowId,
  '-OutputPath', outputPath
]);
```

### 4.2. Routing the Backends

In `packages/terminals/src/BackendFactory.ts`:
- Add `windows-terminal`, `powershell`, `cmd` to the configuration options.
- Map them to the respective classes.

In `packages/terminals/src/snapshotters/index.ts`:
- Update `resolveSnapshotStrategy` to return `new WindowsSnapshotStrategy(backendConfig)` when `process.platform === 'win32'`.

## 5. Tasks

1.  **Core Spawner**: Implement `WindowsNativeSpawner.ts` in `packages/spawn` and integrate it into `SpawnerFactory.ts`.
2.  **Terminal Backends**:
    *   Create `WindowsTerminalBackend.ts`.
    *   Create `PowershellBackend.ts`.
    *   Create `CmdBackend.ts`.
    *   Update `Alacritty` and `WezTerm` to handle `.exe` extensions natively if on Windows.
    *   Update `BackendFactory.ts`.
3.  **Snapshotter**:
    *   Create static script `packages/terminals/src/snapshotters/capture_windows.ps1`.
    *   Implement `WindowsSnapshotStrategy` in `packages/terminals/src/snapshotters/windows.ts` to call the script.
    *   Integrate it into `resolveSnapshotStrategy`.
4.  **Testing**:
    *   Write unit tests for the Windows spawner, terminal backends, and snapshotter, mocking the PowerShell executions.
    *   Update `test/flow.integration.test.ts` to include `defineFlowSuite` definitions for `windows-terminal`, `powershell`, and `cmd`.
    *   Update `packages/terminals/test/backends.integration.test.ts` to include `defineBackendSuite` definitions for `windows-terminal`, `powershell`, and `cmd`.

## 6. Risks and Mitigations

- **DPI Scaling**: `CopyFromScreen` might capture incorrectly on high-DPI displays if PowerShell isn't DPI-aware. *Mitigation: Call `SetProcessDPIAware` in the PowerShell script if necessary.*
- **Occlusion**: A topmost window (e.g., Task Manager) might sit above the terminal. *Mitigation: `SetForegroundWindow` handles 99% of cases, but users shouldn't interact with the machine during automated flow runs.*
- **Execution Policy**: Running a `.ps1` script may be blocked by system execution policies. *Mitigation: Always execute the script using `powershell.exe -ExecutionPolicy Bypass -File ...`.*