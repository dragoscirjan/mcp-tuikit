/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TerminalBackend } from '@mcp-tuikit/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as config from './config.js';
import { FlowRunner } from './runner.js';
import { Flow } from './schema.js';
import * as spawner from './spawner.js';

vi.mock('./spawner.js', () => ({
  spawnTerminal: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./config.js', () => ({
  getBackendConfig: vi.fn(),
}));

vi.mock('./snapshotters/macos.js', () => ({
  captureMacOsWindow: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./backends/playwright.js', () => ({
  capturePlaywrightSnapshot: vi.fn().mockResolvedValue(undefined),
}));

class MockBackend implements TerminalBackend {
  async createSession(_command: string, _cols: number, _rows: number): Promise<string> {
    return 'mock-session-id';
  }
  async closeSession(_sessionId: string): Promise<void> {}
  async sendKeys(_sessionId: string, _keys: string): Promise<any> {
    return {};
  }
  async waitForText(_sessionId: string, _pattern: string, _timeoutMs: number): Promise<any> {
    return {};
  }
  async listSessions(): Promise<any[]> {
    return [];
  }
  async getScreenPlaintext(_sessionId: string): Promise<string> {
    return '';
  }
  async getScreenJson(_sessionId: string): Promise<any> {
    return {};
  }
  async getSessionState(_sessionId: string): Promise<any> {
    return {};
  }
}

describe('FlowRunner', () => {
  let backend: MockBackend;
  let runner: FlowRunner;

  beforeEach(() => {
    vi.clearAllMocks();
    backend = new MockBackend();
    vi.spyOn(backend, 'createSession');
    vi.spyOn(backend, 'sendKeys');
    vi.spyOn(backend, 'closeSession');
    vi.mocked(config.getBackendConfig).mockReturnValue('iterm2');
  });

  it('executes a basic spawn flow and uses correct dimensions', async () => {
    runner = new FlowRunner(backend);
    const flow: Flow = {
      version: '1.0',
      steps: [{ action: 'spawn', cmd: 'echo "hello"', cols: 120, rows: 40 } as any],
    };
    await runner.run(flow);
    expect(backend.createSession).toHaveBeenCalled();
    const createCall = vi.mocked(backend.createSession).mock.calls[0];
    expect(createCall[1]).toBe(120);
    expect(createCall[2]).toBe(40);
    expect(spawner.spawnTerminal).toHaveBeenCalled();
  });

  it('falls back to 120x40 default dimensions', async () => {
    runner = new FlowRunner(backend);
    const flow: Flow = {
      version: '1.0',
      steps: [{ action: 'spawn', cmd: 'echo "hello"' } as any],
    };
    await runner.run(flow);
    const createCall = vi.mocked(backend.createSession).mock.calls[0];
    expect(createCall[1]).toBe(120);
    expect(createCall[2]).toBe(40);
  });

  it('runs playwright backend without spawning a terminal', async () => {
    vi.mocked(config.getBackendConfig).mockReturnValue('playwright');
    runner = new FlowRunner(backend);
    const flow: Flow = {
      version: '1.0',
      steps: [{ action: 'spawn', cmd: 'echo "hello"' } as any],
    };
    await runner.run(flow);
    expect(backend.createSession).toHaveBeenCalled();
    expect(spawner.spawnTerminal).not.toHaveBeenCalled();
  });

  it('sends keys to the terminal', async () => {
    runner = new FlowRunner(backend);
    const flow: Flow = {
      version: '1.0',
      steps: [{ action: 'spawn', cmd: 'echo "hello"' } as any, { action: 'type', text: 'ls', submit: true } as any],
    };
    await runner.run(flow);
    expect(backend.sendKeys).toHaveBeenCalledWith('mock-session-id', 'ls\n');
  });

  it('cleans up session on close', async () => {
    runner = new FlowRunner(backend);
    const flow: Flow = {
      version: '1.0',
      steps: [{ action: 'spawn', cmd: 'echo "hello"' } as any],
    };
    await runner.run(flow);
    await runner.cleanup();
    expect(backend.closeSession).toHaveBeenCalledWith('mock-session-id');
  });
});
