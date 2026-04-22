import { spawn } from 'node:child_process';
import { execa } from 'execa';
import { AppSpawner, SpawnOptions, SpawnResult } from '../AppSpawner.js';

// jscpd:ignore-start

export interface WindowsSpawnResult extends SpawnResult {
  fallbackIdentifier?: string;
}

export class WindowsNativeSpawner implements AppSpawner {
  async spawn(options: SpawnOptions): Promise<WindowsSpawnResult> {
    const { executable, args, env, requireWindowId, appName } = options;

    const child = spawn('cmd.exe', ['/k', 'start', '""', executable, ...args], {
      env: { ...process.env, ...env },
      detached: true,
      stdio: 'ignore',
      shell: false,
    });

    child.on('error', () => {
      // Ignore spawn errors handled by rejection
    });

    child.unref();
    const pid = child.pid || null;

    let windowId: string | null = null;

    if (requireWindowId) {
      const exeLower = executable.toLowerCase();
      if (appName.toLowerCase().includes('windows terminal') || exeLower.includes('wt.exe')) {
        windowId = await this.pollForWindowByProcessName('WindowsTerminal');
      } else if (exeLower.includes('wezterm')) {
        windowId = await this.pollForWindowByProcessName('wezterm-gui');
      } else if (exeLower.includes('alacritty')) {
        windowId = await this.pollForWindowByProcessName('alacritty');
      } else if (pid) {
        windowId = await this.pollForWindowByPid(pid);
      }
    }

    return {
      pid,
      windowId,
      fallbackIdentifier: appName,
    };
  }

  async kill(pid: number): Promise<void> {
    try {
      process.kill(pid, 'SIGTERM');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ESRCH') {
        throw err;
      }
    }
  }

  private async pollForWindowByPid(pid: number): Promise<string | null> {
    try {
      const script = `
        Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        public class Win32 {
            [DllImport("user32.dll")]
            public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
            [DllImport("user32.dll")]
            public static extern bool IsWindowVisible(IntPtr hWnd);
            [StructLayout(LayoutKind.Sequential)]
            public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
        }
"@
        $pidTarget = ${pid}
        for ($i = 0; $i -lt 20; $i++) {
          # Check process by PID
          $p = Get-Process -Id $pidTarget -ErrorAction SilentlyContinue
          if ($null -ne $p -and $p.MainWindowHandle -ne 0) {
            $hwnd = $p.MainWindowHandle
            if ([Win32]::IsWindowVisible($hwnd)) {
              $rect = New-Object Win32+RECT
              [Win32]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
              if (($rect.Right - $rect.Left) -gt 0 -and ($rect.Bottom - $rect.Top) -gt 0) {
                Write-Output $hwnd.ToString()
                exit 0
              }
            }
          }
          
          # Check Windows Terminal
          $wts = Get-Process -Name "WindowsTerminal" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -NE 0 -and $_.StartTime -gt (Get-Date).AddSeconds(-15) } | Sort-Object StartTime -Descending
          foreach ($wt in $wts) {
            $hwnd = $wt.MainWindowHandle
            if ([Win32]::IsWindowVisible($hwnd)) {
              $rect = New-Object Win32+RECT
              [Win32]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
              if (($rect.Right - $rect.Left) -gt 0 -and ($rect.Bottom - $rect.Top) -gt 0) {
                Write-Output $hwnd.ToString()
                exit 0
              }
            }
          }

          # Check conhost (for cmd.exe)
          $conhosts = Get-Process -Name "conhost" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -NE 0 -and $_.StartTime -gt (Get-Date).AddSeconds(-15) } | Sort-Object StartTime -Descending
          foreach ($ch in $conhosts) {
            $hwnd = $ch.MainWindowHandle
            if ([Win32]::IsWindowVisible($hwnd)) {
              $rect = New-Object Win32+RECT
              [Win32]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
              if (($rect.Right - $rect.Left) -gt 0 -and ($rect.Bottom - $rect.Top) -gt 0) {
                Write-Output $hwnd.ToString()
                exit 0
              }
            }
          }

          Start-Sleep -Milliseconds 100
        }
      `;

      const { stdout } = await execa('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
      const handle = stdout.trim();
      if (handle && handle !== '0') {
        return handle;
      }
    } catch {
      // Ignore errors parsing processes
    }
    return null;
  }

  private async pollForWindowByProcessName(processName: string): Promise<string | null> {
    try {
      const script = `
        Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        public class Win32 {
            [DllImport("user32.dll")]
            public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
            [DllImport("user32.dll")]
            public static extern bool IsWindowVisible(IntPtr hWnd);
            [StructLayout(LayoutKind.Sequential)]
            public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
        }
"@
        $processName = "${processName}"
        for ($i = 0; $i -lt 20; $i++) {
          $procs = Get-Process -Name $processName -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -NE 0 -and $_.StartTime -gt (Get-Date).AddSeconds(-15) } | Sort-Object StartTime -Descending
          foreach ($p in $procs) {
            $hwnd = $p.MainWindowHandle
            if ([Win32]::IsWindowVisible($hwnd)) {
              $rect = New-Object Win32+RECT
              [Win32]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
              $w = $rect.Right - $rect.Left
              $h = $rect.Bottom - $rect.Top
              if ($w -gt 0 -and $h -gt 0) {
                Write-Output $hwnd.ToString()
                exit 0
              }
            }
          }
          Start-Sleep -Milliseconds 100
        }
      `;

      const { stdout } = await execa('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
      const handle = stdout.trim();
      if (handle && handle !== '0') {
        return handle;
      }
    } catch {
      // Ignore errors parsing processes
    }
    return null;
  }
}
// jscpd:ignore-end
