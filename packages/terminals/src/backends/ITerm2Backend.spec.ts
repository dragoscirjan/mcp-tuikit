import { describe, expect, it } from 'vitest';
import { ITerm2Backend } from './ITerm2Backend';

describe.runIf(process.platform === 'darwin')('ITerm2Backend', () => {
  it('should have correct osascript properties', () => {
    const backend = new ITerm2Backend({} as unknown, {} as unknown);
    const b = backend as unknown as Record<string, unknown>;
    expect(b.appName).toBe('iTerm');
    expect(b.generateFocusCmd).toContain('select targetWindow');

    const spawnCmd = b.generateSpawnCmd('echo "hello"');
    expect(spawnCmd).toContain('create window with default profile command "echo \\"hello\\""');

    const closeCmd = b.generateCloseCmd('123');
    expect(closeCmd).toContain('set targetWindow to window id 123');
    expect(closeCmd).toContain('close targetWindow');
  });
});
