import { Snapshotter } from '@mcp-tuikit/core';

/**
 * Stub snapshotter for Linux.
 *
 * A native implementation using xdotool + scrot (or similar) is planned.
 * Until then, set `TUIKIT_TERMINAL=xterm.js` to use the Playwright/xterm.js
 * renderer, which works on Linux without any additional dependencies.
 */
export class LinuxSnapshotter implements Snapshotter {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async capture(_outputPath: string, _cols: number, _rows: number, _tmuxSession: string): Promise<void> {
    throw new Error(
      'Linux native PNG capture is not yet implemented. ' +
        'Set TUIKIT_TERMINAL=xterm.js to use the Playwright/xterm.js renderer instead.',
    );
  }
}
