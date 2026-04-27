import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SnapshotStrategy } from '../SnapshotStrategy.js';
import { Terminal } from '../Terminal.js';
import { execa } from 'execa';

export class WindowsSnapshotStrategy implements SnapshotStrategy {
  constructor(private readonly terminalName: Terminal) {}

  async capture(
    outputPath: string,
    _cols: number,
    _rows: number,
    _tmuxSession: string,
    spawnResult?: { windowHandle?: string },
  ): Promise<void> {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const scriptPath = path.join(currentDir, 'capture_windows.ps1');
    const windowHandle = spawnResult?.windowHandle || '';

    // Use executable/app name to identify process if window handle is not available
    let targetProcessName = '';
    const targetWindowId = windowHandle;

    if (!targetWindowId) {
      targetProcessName = this.getProcessNameForTerminal(this.terminalName);
    }

    await execa('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath,
      '-TargetWindowId',
      targetWindowId,
      '-TargetProcessName',
      targetProcessName,
      '-OutputPath',
      outputPath,
    ]);
  }

  private getProcessNameForTerminal(terminalName: Terminal): string {
    switch (terminalName) {
      case 'windows-terminal':
        return 'WindowsTerminal';
      case 'powershell':
        return 'powershell';
      // case 'cmd':
      //   return 'cmd';
      case 'wezterm':
        return 'wezterm-gui';
      case 'alacritty':
        return 'alacritty';
      default:
        // Fallback for others, though this shouldn't normally be hit
        return terminalName;
    }
  }
}
