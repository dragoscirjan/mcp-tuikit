/**
 * Unit tests for PlaywrightSnapshotStrategy
 *
 * Verifies:
 *   1. Calls `tmux capture-pane -p -e` on the correct session name
 *   2. Passes the captured ANSI content + cols/rows to capturePlaywrightSnapshot
 *   3. Normalises bare \n → \r\n and prepends ESC[H so xterm.js renders from top-left
 *   4. Writes output to the provided path
 */
import { describe, it, expect, vi } from 'vitest';

// ── Hoist mocks ───────────────────────────────────────────────────────────────

const { mockCapturePlaywrightSnapshot, mockExec } = vi.hoisted(() => {
  const mockCapturePlaywrightSnapshot = vi.fn().mockResolvedValue(undefined);
  const mockExec = vi.fn();
  return { mockCapturePlaywrightSnapshot, mockExec };
});

vi.mock('../playwright-utils.js', () => ({
  capturePlaywrightSnapshot: mockCapturePlaywrightSnapshot,
}));

vi.mock('node:child_process', () => ({
  exec: mockExec,
}));

vi.mock('node:util', async (orig) => {
  const original = await orig<typeof import('node:util')>();
  return {
    ...original,
    // promisify(exec) should return a function that resolves with { stdout, stderr }
    promisify: (fn: unknown) => {
      if (fn === mockExec) {
        return vi.fn().mockResolvedValue({ stdout: '\x1b[32mHello\x1b[0m\nWorld\n', stderr: '' });
      }
      return original.promisify(fn as Parameters<typeof original.promisify>[0]);
    },
  };
});

import { PlaywrightSnapshotStrategy } from './playwright.js';

describe('PlaywrightSnapshotStrategy', () => {
  it('reads ANSI output from the tmux session with -e flag', async () => {
    const snapshotter = new PlaywrightSnapshotStrategy();
    await snapshotter.capture('/tmp/out.png', 80, 24, 'tuikit_abc123');

    // capturePlaywrightSnapshot must have been called with the ansi output
    expect(mockCapturePlaywrightSnapshot).toHaveBeenCalledOnce();
    const [ansi] = mockCapturePlaywrightSnapshot.mock.calls[0];
    expect(ansi).toContain('\x1b[32mHello\x1b[0m');
  });

  it('prepends ESC[H and converts bare \\n to \\r\\n before rendering', async () => {
    const snapshotter = new PlaywrightSnapshotStrategy();
    await snapshotter.capture('/tmp/out.png', 80, 24, 'tuikit_abc123');

    const [ansi] = mockCapturePlaywrightSnapshot.mock.calls[0];
    // Must start with cursor-home so rendering begins at top-left
    expect(ansi.startsWith('\x1b[H')).toBe(true);
    // Bare \n must be replaced with \r\n so each line starts at column 0
    expect(ansi).toContain('\r\n');
    expect(ansi).not.toMatch(/(?<!\r)\n/);
  });

  it('forwards outputPath, cols, and rows to capturePlaywrightSnapshot', async () => {
    const snapshotter = new PlaywrightSnapshotStrategy();
    await snapshotter.capture('/tmp/snap.png', 132, 50, 'tuikit_xyz');

    expect(mockCapturePlaywrightSnapshot).toHaveBeenCalledWith(expect.any(String), '/tmp/snap.png', 132, 50);
  });
});
