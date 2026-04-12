/**
 * Platform-agnostic interface for capturing a PNG of a terminal session.
 *
 * Each platform (macOS, Linux, Windows) and each rendering backend
 * (native window capture, Playwright/xterm.js) provides its own implementation.
 * Consumers depend only on this interface — never on a concrete class.
 */
export interface Snapshotter {
  /**
   * Capture a PNG of the current terminal state and write it to `outputPath`.
   *
   * @param outputPath  Absolute or relative path where the PNG will be written.
   * @param cols        Terminal width in columns — needed by renderers that
   *                    construct a virtual terminal (e.g. Playwright/xterm.js).
   * @param rows        Terminal height in rows — same as above.
   * @param tmuxSession Inner tmux session name used to read back the current
   *                    ANSI screen content when required by the implementation.
   */
  capture(outputPath: string, cols: number, rows: number, tmuxSession: string): Promise<void>;
}
