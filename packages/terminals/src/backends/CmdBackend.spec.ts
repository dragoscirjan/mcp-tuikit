import fs from 'node:fs';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CmdBackend } from './CmdBackend';

vi.mock('node:fs');

describe.runIf(process.platform === 'win32')('CmdBackend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate correct spawn options and write bat file', async () => {
    const backend = new CmdBackend({} as unknown, {} as unknown);
    (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).cols = 80;
    (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).rows = 24;

    const options = await (backend as unknown as { getSpawnOptions: (...args: unknown[]) => unknown }).getSpawnOptions(
      '/path/to/tmux',
      'test-session',
    );

    expect(options.appName).toBe('Command Prompt');
    expect(options.executable).toBe('cmd.exe');
    expect(options.args).toHaveLength(2);
    expect(options.args[0]).toBe('/k');
    expect(options.args[1]).toMatch(/mcp-tuikit-cmd-test-session\.bat/);
    expect(options.requireWindowId).toBe(true);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      options.args[1],
      `@echo off\r\nmode con: cols=80 lines=24\r\n"/path/to/tmux" attach -t "test-session"\r\n`,
    );
  });
});
