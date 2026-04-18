/* eslint-disable @typescript-eslint/no-unused-vars */

import { TerminalBackend } from '@mcp-tuikit/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlowRunner } from './runner.js';
import { Flow } from './schema.js';

vi.mock('node:fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));

class MockBackend implements TerminalBackend {
  async connect(_command: string, _cols: number, _rows: number): Promise<void> {}
  async disconnect(): Promise<void> {}
  async sendKeys(_keys: string): Promise<void> {}
  async waitForText(_pattern: string, _timeoutMs: number): Promise<void> {}
  async takeSnapshot(_outputPath: string, _format: 'txt' | 'png', _cols: number, _rows: number): Promise<void> {}
  onData(_callback: (data: string) => void): { dispose: () => void } | null {
    return { dispose: vi.fn() };
  }
}

describe('FlowRunner', () => {
  let backend: MockBackend;

  beforeEach(() => {
    vi.clearAllMocks();
    backend = new MockBackend();
    vi.spyOn(backend, 'connect');
    vi.spyOn(backend, 'sendKeys');
    vi.spyOn(backend, 'disconnect');
    vi.spyOn(backend, 'takeSnapshot');
  });

  it('uses cols/rows from constructor for session creation', async () => {
    const runner = new FlowRunner(backend, 120, 40);
    const flow: Flow = {
      version: '1.0',
      steps: [{ action: 'spawn', cmd: 'echo "hello"' }],
    };
    await runner.run(flow);
    expect(backend.connect).toHaveBeenCalledWith('echo "hello"', 120, 40);
  });

  it('uses default 80x30 when no cols/rows provided', async () => {
    const runner = new FlowRunner(backend);
    const flow: Flow = {
      version: '1.0',
      steps: [{ action: 'spawn', cmd: 'echo "hello"' }],
    };
    await runner.run(flow);
    expect(backend.connect).toHaveBeenCalledWith('echo "hello"', 80, 30);
  });

  it('sends keys to the terminal', async () => {
    const runner = new FlowRunner(backend);
    const flow: Flow = {
      version: '1.0',
      steps: [
        { action: 'spawn', cmd: 'echo "hello"' },
        { action: 'type', text: 'ls', submit: true },
      ],
    };
    await runner.run(flow);
    expect(backend.sendKeys).toHaveBeenCalledWith('ls\n');
  });

  it('cleans up session on close', async () => {
    const runner = new FlowRunner(backend);
    const flow: Flow = {
      version: '1.0',
      steps: [{ action: 'spawn', cmd: 'echo "hello"' }],
    };
    await runner.run(flow);
    await runner.cleanup();
    expect(backend.disconnect).toHaveBeenCalled();
  });

  it('returns artifacts with format and intent', async () => {
    const runner = new FlowRunner(backend, 80, 30);
    const flow: Flow = {
      version: '1.0',
      steps: [
        { action: 'spawn', cmd: 'btop' },
        { action: 'snapshot', format: 'txt', outputPath: 'out_{hash}.txt', intent: 'verify borders' },
      ],
    };
    await runner.run(flow);
    const artifacts = runner.artifacts;
    expect(artifacts.length).toBe(1);
    expect(artifacts[0].format).toBe('txt');
    expect(artifacts[0].intent).toBe('verify borders');
    expect(artifacts[0].path).toMatch(/out_.+\.txt/);
  });

  it('captures a png snapshot via the backend', async () => {
    const runner = new FlowRunner(backend, 80, 30);
    const flow: Flow = {
      version: '1.0',
      steps: [
        { action: 'spawn', cmd: 'btop' },
        { action: 'snapshot', format: 'png', outputPath: 'out_{hash}.png', intent: 'visual check' },
      ],
    };
    await runner.run(flow);

    expect(backend.takeSnapshot).toHaveBeenCalledWith(expect.stringMatching(/out_.+\.png/), 'png', 80, 30);
    const artifacts = runner.artifacts;
    expect(artifacts.length).toBe(1);
    expect(artifacts[0].format).toBe('png');
    expect(artifacts[0].path).toMatch(/out_.+\.png/);
  });

  it('captures both txt and png snapshots in one flow', async () => {
    const runner = new FlowRunner(backend, 80, 30);
    const flow: Flow = {
      version: '1.0',
      steps: [
        { action: 'spawn', cmd: 'btop' },
        { action: 'snapshot', format: 'txt', outputPath: 'out_{hash}.txt', intent: 'text check' },
        { action: 'snapshot', format: 'png', outputPath: 'out_{hash}.png', intent: 'visual check' },
      ],
    };
    await runner.run(flow);

    expect(backend.takeSnapshot).toHaveBeenCalledTimes(2);
    const artifacts = runner.artifacts;
    expect(artifacts.length).toBe(2);
    expect(artifacts.map((a) => a.format)).toEqual(['txt', 'png']);
  });
});
