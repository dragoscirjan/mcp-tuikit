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
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    
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

$hwnd = [IntPtr]::Zero

if (![string]::IsNullOrEmpty($TargetWindowId)) {
    $hwnd = [IntPtr][int64]$TargetWindowId
}

# If we couldn't use TargetWindowId, try to find it by name
if ($hwnd -eq [IntPtr]::Zero -and ![string]::IsNullOrEmpty($TargetProcessName)) {
    $procs = Get-Process -Name $TargetProcessName -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -NE 0 -and $_.StartTime -gt (Get-Date).AddSeconds(-15) } | Sort-Object StartTime -Descending
    if ($procs -and $procs.Count -gt 0) {
        $hwnd = $procs[0].MainWindowHandle
    }
}

# For cmd, if process name is empty or cmd fails, try conhost
if ($hwnd -eq [IntPtr]::Zero) {
    $procs = Get-Process -Name "conhost" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -NE 0 -and $_.StartTime -gt (Get-Date).AddSeconds(-15) } | Sort-Object StartTime -Descending
    if ($procs -and $procs.Count -gt 0) {
        $hwnd = $procs[0].MainWindowHandle
    }
}

if ($hwnd -eq [IntPtr]::Zero) {
    $procs = Get-Process -Name "WindowsTerminal" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -NE 0 -and $_.StartTime -gt (Get-Date).AddSeconds(-15) } | Sort-Object StartTime -Descending
    if ($procs -and $procs.Count -gt 0) {
        $hwnd = $procs[0].MainWindowHandle
    }
}

if ($hwnd -eq [IntPtr]::Zero) {
    Write-Error "Could not find target window."
    exit 1
}

# SW_RESTORE (9) will restore if minimized
[Win32]::ShowWindow($hwnd, 9) | Out-Null
[Win32]::SetForegroundWindow($hwnd) | Out-Null

$rect = New-Object Win32+RECT

$width = 0
$height = 0

# Poll until the window is visible and has dimensions > 0
for ($i = 0; $i -lt 40; $i++) {
    if ([Win32]::IsWindowVisible($hwnd)) {
        [Win32]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
        $width = $rect.Right - $rect.Left
        $height = $rect.Bottom - $rect.Top

        if ($width -gt 0 -and $height -gt 0) {
            break
        }
    }
    Start-Sleep -Milliseconds 250
}

if ($width -le 0 -or $height -le 0) {
    Write-Error "Invalid window dimensions ($width x $height)."
    exit 1
}

# One more small sleep after we know it's > 0x0 to let contents paint
Start-Sleep -Milliseconds 300

$bitmap = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

try {
    $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bitmap.Size)
    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
    if ($graphics) { $graphics.Dispose() }
    if ($bitmap) { $bitmap.Dispose() }
}
