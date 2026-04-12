import * as child_process from 'node:child_process';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { captureMacOsWindow } from '../../src/snapshotters/macos.js';

vi.mock('node:child_process');

type ExecFileCallback = (error: Error | null, stdout: string, stderr: string) => void;

describe('captureMacOsWindow', () => {
  const mockExecFile = vi.mocked(child_process.execFile);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should successfully capture a window when window ID is found', async () => {
    // Mock osascript success finding window ID "12345"
    mockExecFile.mockImplementation(
      (
        file: string,
        args: ReadonlyArray<string> | undefined | null | unknown,
        options: unknown,
        callback?: unknown,
      ): child_process.ChildProcess => {
        let cb: ExecFileCallback;
        if (typeof options === 'function') {
          cb = options as ExecFileCallback;
        } else if (typeof callback === 'function') {
          cb = callback as ExecFileCallback;
        } else {
          cb = args as ExecFileCallback;
        }

        if (file === 'osascript') {
          // Return window ID 12345
          cb(null, '12345\n', '');
          return {} as child_process.ChildProcess;
        }

        if (file === 'screencapture') {
          // Assert screencapture is called with right args
          cb(null, '', '');
          return {} as child_process.ChildProcess;
        }

        cb(new Error(`Unexpected call to ${file}`), '', '');
        return {} as child_process.ChildProcess;
      },
    );

    // Call but don't assert inside the mock since we want to avoid conditional asserts
    // Wait, the expect(args) is technically a conditional expect. Let's just mock without assert, then assert arguments.
    mockExecFile.mockImplementation(
      (
        file: string,
        args: ReadonlyArray<string> | undefined | null | unknown,
        options: unknown,
        callback?: unknown,
      ): child_process.ChildProcess => {
        let cb: ExecFileCallback;
        if (typeof options === 'function') {
          cb = options as ExecFileCallback;
        } else if (typeof callback === 'function') {
          cb = callback as ExecFileCallback;
        } else {
          cb = args as ExecFileCallback;
        }

        if (file === 'osascript') {
          cb(null, '12345\n', '');
        } else if (file === 'screencapture') {
          cb(null, '', '');
        } else {
          cb(new Error(`Unexpected call to ${file}`), '', '');
        }
        return {} as child_process.ChildProcess;
      },
    );

    await expect(captureMacOsWindow('iTerm', '/tmp/output.png')).resolves.toBeUndefined();

    // Verify osascript was called
    expect(mockExecFile).toHaveBeenCalledWith('osascript', expect.any(Array), expect.any(Function));
    // Verify screencapture was called with right args
    expect(mockExecFile).toHaveBeenCalledWith(
      'screencapture',
      ['-l', '12345', '/tmp/output.png'],
      expect.any(Function),
    );
  });

  it('should throw timeout error if window is not found (osascript continuously fails)', async () => {
    mockExecFile.mockImplementation(
      (
        file: string,
        args: ReadonlyArray<string> | undefined | null | unknown,
        options: unknown,
        callback?: unknown,
      ): child_process.ChildProcess => {
        const cb = (
          typeof options === 'function' ? options : typeof callback === 'function' ? callback : args
        ) as ExecFileCallback;
        if (file === 'osascript') {
          cb(new Error('execution error'), '', 'execution error: Can’t get window 1 of application "iTerm"');
          return {} as child_process.ChildProcess;
        }
        cb(new Error(`Unexpected call to ${file}`), '', '');
        return {} as child_process.ChildProcess;
      },
    );

    await expect(captureMacOsWindow('iTerm', '/tmp/output.png', 50, 10)).rejects.toThrow(/Timeout waiting for window/);
  });

  it('should throw an error if screencapture fails', async () => {
    mockExecFile.mockImplementation(
      (
        file: string,
        args: ReadonlyArray<string> | undefined | null | unknown,
        options: unknown,
        callback?: unknown,
      ): child_process.ChildProcess => {
        const cb = (
          typeof options === 'function' ? options : typeof callback === 'function' ? callback : args
        ) as ExecFileCallback;
        if (file === 'osascript') {
          cb(null, '12345\n', '');
          return {} as child_process.ChildProcess;
        }
        if (file === 'screencapture') {
          cb(new Error('screencapture failed'), '', 'permission denied');
          return {} as child_process.ChildProcess;
        }
        cb(new Error(`Unexpected call to ${file}`), '', '');
        return {} as child_process.ChildProcess;
      },
    );

    await expect(captureMacOsWindow('iTerm', '/tmp/output.png')).rejects.toThrow(/Failed to capture window/);
  });

  it('should timeout if window does not appear within the specified timeframe', async () => {
    // Make osascript fail continuously
    mockExecFile.mockImplementation(
      (
        file: string,
        args: ReadonlyArray<string> | undefined | null | unknown,
        options: unknown,
        callback?: unknown,
      ): child_process.ChildProcess => {
        const cb = (
          typeof options === 'function' ? options : typeof callback === 'function' ? callback : args
        ) as ExecFileCallback;
        if (file === 'osascript') {
          cb(new Error('window not found'), '', '');
          return {} as child_process.ChildProcess;
        }
        return {} as child_process.ChildProcess;
      },
    );

    await expect(captureMacOsWindow('iTerm', '/tmp/output.png', 50, 10)).rejects.toThrow(/Timeout waiting for window/);
  });
});
