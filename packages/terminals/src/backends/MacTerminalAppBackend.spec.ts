import { describe, expect, it } from 'vitest';
import { MacTerminalAppBackend } from './MacTerminalAppBackend';

describe.runIf(process.platform === 'darwin')('MacTerminalAppBackend', () => {
  it('should have correct osascript properties', () => {
    const backend = new MacTerminalAppBackend({} as unknown, {} as unknown);
    const b = backend as unknown as Record<string, unknown>;
    expect(b.appName).toBe('Terminal');
    expect(b.generateFocusCmd).toContain('set frontmost of targetWindow to true');

    const spawnCmd = b.generateSpawnCmd('echo "hello"');
    expect(spawnCmd).toContain('set newTab to do script "echo \\"hello\\""');

    const closeCmd = b.generateCloseCmd('123');
    expect(closeCmd).toContain('close (every window whose id is 123)');
  });
});
