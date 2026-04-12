import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { Snapshotter } from '@mcp-tuikit/core';
import { capturePlaywrightSnapshot } from '../backends/playwright.js';

const execAsync = promisify(exec);

/**
 * Snapshotter that works on every platform by reading the current ANSI screen
 * content from the tmux pane and rendering it through xterm.js in a Playwright
 * browser.  The resulting PNG is written to `outputPath`.
 *
 * Use this snapshotter when:
 *  - `TUIKIT_TERMINAL=xterm.js` is set explicitly
 *  - Running in CI (`CI=1`)
 *  - No native window-capture backend is available for the current OS
 */
export class PlaywrightSnapshotter implements Snapshotter {
  async capture(outputPath: string, cols: number, rows: number, tmuxSession: string): Promise<void> {
    // -e preserves escape sequences so xterm.js renders colours correctly
    const { stdout: ansi } = await execAsync(`tmux capture-pane -p -e -t ${tmuxSession}`);

    // tmux capture-pane emits bare \n (LF only). xterm.js treats \n as "move
    // cursor down" without returning to column 0, so every line after the first
    // is indented by the column the previous line ended on — producing the
    // left-crop artefact visible in screenshots.
    //
    // Fix: convert \n → \r\n so each line starts at column 0, and prepend
    // ESC[H (cursor home) so rendering always starts at the top-left cell.
    const normalised = '\x1b[H' + ansi.replace(/\r?\n/g, '\r\n');

    await capturePlaywrightSnapshot(normalised, outputPath, cols, rows);
  }
}
