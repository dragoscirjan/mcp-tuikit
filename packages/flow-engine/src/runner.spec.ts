import { TerminalBackend } from '@mcp-tuikit/core';
import { describe, it, expect, vi } from 'vitest';
import { FlowRunner } from './runner.js';

describe('FlowRunner', () => {
  it('should run a sequence of actions', async () => {
    const mockBackend: TerminalBackend = {
      createSession: vi.fn().mockResolvedValue('session-1'),
      closeSession: vi.fn().mockResolvedValue(undefined),
      sendKeys: vi.fn().mockResolvedValue({}),
      waitForText: vi.fn().mockResolvedValue({}),
      getScreenPlaintext: vi.fn().mockResolvedValue('mock screen'),
      getScreenJson: vi.fn().mockResolvedValue({}),
      getSessionState: vi.fn().mockResolvedValue('active'),
    };

    const runner = new FlowRunner(mockBackend);
    await runner.run({
      version: '1.0',
      steps: [
        { action: 'spawn', cmd: 'bash', cols: 80, rows: 24 },
        { action: 'type', text: 'ls', submit: true },
        { action: 'wait_for', pattern: 'file.txt', timeoutMs: 100 },
      ],
    });

    expect(mockBackend.createSession).toHaveBeenCalledWith('bash', 80, 24);
    expect(mockBackend.sendKeys).toHaveBeenCalledWith('session-1', 'ls\n');
    expect(mockBackend.waitForText).toHaveBeenCalledWith('session-1', 'file.txt', 100);
  });

  it('should use onData rolling buffer if available', async () => {
    let mockDataCallback: ((data: string) => void) | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockBackend: TerminalBackend & { onData: any } = {
      createSession: vi.fn().mockResolvedValue('session-1'),
      closeSession: vi.fn().mockResolvedValue(undefined),
      sendKeys: vi.fn().mockResolvedValue({}),
      waitForText: vi.fn().mockResolvedValue({}),
      getScreenPlaintext: vi.fn().mockResolvedValue('mock screen'),
      getScreenJson: vi.fn().mockResolvedValue({}),
      getSessionState: vi.fn().mockResolvedValue('active'),
      onData: vi.fn().mockImplementation((_sessionId, cb) => {
        mockDataCallback = cb;
        return { dispose: vi.fn() };
      }),
    };

    const runner = new FlowRunner(mockBackend);

    const runPromise = runner.run({
      version: '1.0',
      steps: [
        { action: 'spawn', cmd: 'bash', cols: 80, rows: 24 },
        { action: 'wait_for', pattern: 'target-text', timeoutMs: 1000 },
      ],
    });

    setTimeout(() => {
      mockDataCallback?.('tar');
    }, 10);
    setTimeout(() => {
      mockDataCallback?.('get-text');
    }, 20);

    await runPromise;

    expect(mockBackend.onData).toHaveBeenCalled();
    expect(mockBackend.waitForText).not.toHaveBeenCalled();
  });
});
