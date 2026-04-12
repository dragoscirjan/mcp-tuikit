import { Snapshotter } from '@mcp-tuikit/core';

/**
 * Stub snapshotter for Windows.
 *
 * A native implementation using PowerShell + System.Drawing is planned.
 * Until then, set `TUIKIT_TERMINAL=xterm.js` to use the Playwright/xterm.js
 * renderer, which works on Windows without any additional dependencies.
 */
export class WindowsSnapshotter implements Snapshotter {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async capture(_outputPath: string, _cols: number, _rows: number, _tmuxSession: string): Promise<void> {
    throw new Error(
      'Windows native PNG capture is not yet implemented. ' +
        'Set TUIKIT_TERMINAL=xterm.js to use the Playwright/xterm.js renderer instead.',
    );
  }
}
