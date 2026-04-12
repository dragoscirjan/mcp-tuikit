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
  closeTerminal: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./config.js', () => ({
  getBackendConfig: vi.fn(),
}));

// Mock the snapshotter factory — the only abstraction point for PNG capture.
// Individual snapshotter implementations are tested separately.
const mockSnapshotterCapture = vi.fn().mockResolvedValue(undefined);
vi.mock('./snapshotters/index.js', () => ({
  resolveSnapshotter: vi.fn(() => ({ capture: mockSnapshotterCapture })),
}));

vi.mock('node:fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('node:util', async (orig) => {
  const original = await orig<typeof import('node:util')>();
  return {
    ...original,
    promisify: () => () => Promise.resolve({ stdout: 'screen content', stderr: '' }),
  };
});

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

  beforeEach(() => {
    vi.clearAllMocks();
    mockSnapshotterCapture.mockResolvedValue(undefined);
    backend = new MockBackend();
    vi.spyOn(backend, 'createSession');
    vi.spyOn(backend, 'sendKeys');
    vi.spyOn(backend, 'closeSession');
    vi.mocked(config.getBackendConfig).mockReturnValue('iterm2');
  });

  it('uses cols/rows from constructor for session creation', async () => {
    const runner = new FlowRunner(backend, 120, 40);
    const flow: Flow = {
      version: '1.0',
      steps: [{ action: 'spawn', cmd: 'echo "hello"' }],
    };
    await runner.run(flow);
    expect(backend.createSession).toHaveBeenCalled();
    const createCall = vi.mocked(backend.createSession).mock.calls[0];
    expect(createCall[1]).toBe(120);
    expect(createCall[2]).toBe(40);
    expect(spawner.spawnTerminal).toHaveBeenCalledWith('iterm2', expect.any(String), 120, 40);
  });

  it('uses default 80x30 when no cols/rows provided', async () => {
    const runner = new FlowRunner(backend);
    const flow: Flow = {
      version: '1.0',
      steps: [{ action: 'spawn', cmd: 'echo "hello"' }],
    };
    await runner.run(flow);
    const createCall = vi.mocked(backend.createSession).mock.calls[0];
    expect(createCall[1]).toBe(80);
    expect(createCall[2]).toBe(30);
  });

  it('runs xterm.js backend without spawning a terminal', async () => {
    vi.mocked(config.getBackendConfig).mockReturnValue('xterm.js');
    const runner = new FlowRunner(backend, 120, 40);
    const flow: Flow = {
      version: '1.0',
      steps: [{ action: 'spawn', cmd: 'echo "hello"' }],
    };
    await runner.run(flow);
    expect(backend.createSession).toHaveBeenCalled();
    expect(spawner.spawnTerminal).not.toHaveBeenCalled();
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
    expect(backend.sendKeys).toHaveBeenCalledWith(expect.stringMatching(/^tuikit_/), 'ls\n');
  });

  it('cleans up session on close', async () => {
    const runner = new FlowRunner(backend);
    const flow: Flow = {
      version: '1.0',
      steps: [{ action: 'spawn', cmd: 'echo "hello"' }],
    };
    await runner.run(flow);
    await runner.cleanup();
    expect(backend.closeSession).toHaveBeenCalledWith(expect.stringMatching(/^tuikit_/));
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

  it('captures a png snapshot via the resolved Snapshotter', async () => {
    const { resolveSnapshotter } = await import('./snapshotters/index.js');
    const runner = new FlowRunner(backend, 80, 30);
    const flow: Flow = {
      version: '1.0',
      steps: [
        { action: 'spawn', cmd: 'btop' },
        { action: 'snapshot', format: 'png', outputPath: 'out_{hash}.png', intent: 'visual check' },
      ],
    };
    await runner.run(flow);
    expect(resolveSnapshotter).toHaveBeenCalledWith('iterm2');
    expect(mockSnapshotterCapture).toHaveBeenCalledWith(
      expect.stringMatching(/out_.+\.png/),
      80,
      30,
      expect.stringMatching(/^tuikit_/),
    );
    const artifacts = runner.artifacts;
    expect(artifacts.length).toBe(1);
    expect(artifacts[0].format).toBe('png');
    expect(artifacts[0].path).toMatch(/out_.+\.png/);
  });

  it('captures both txt and png snapshots in one flow', async () => {
    const { resolveSnapshotter } = await import('./snapshotters/index.js');
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
    expect(resolveSnapshotter).toHaveBeenCalledOnce();
    expect(mockSnapshotterCapture).toHaveBeenCalledOnce();
    const artifacts = runner.artifacts;
    expect(artifacts.length).toBe(2);
    expect(artifacts.map((a) => a.format)).toEqual(['txt', 'png']);
  });
});
