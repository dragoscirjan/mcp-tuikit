import { promises as fs } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import type { Terminal as HeadlessTerminal } from '@xterm/headless';
import headlessPkg from '@xterm/headless';
const { Terminal } = headlessPkg as unknown as { Terminal: new (options: unknown) => HeadlessTerminal };
import { execa } from 'execa';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { HeadlessSnapshotStrategy } from './headless.js';

vi.mock('execa');
vi.mock('@xterm/headless', () => {
  const Terminal = vi.fn();
  return {
    Terminal,
    default: { Terminal },
  };
});
vi.mock('@resvg/resvg-js');
vi.mock('node:fs', async () => {
  return {
    default: {
      promises: {
        writeFile: vi.fn(),
      },
    },
    promises: {
      writeFile: vi.fn(),
    },
  };
});

describe('HeadlessSnapshotStrategy', () => {
  let strategy: HeadlessSnapshotStrategy;

  beforeEach(() => {
    strategy = new HeadlessSnapshotStrategy();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should capture a tmux pane and render it to a PNG', async () => {
    const outputPath = '/fake/output.png';
    const cols = 80;
    const rows = 24;
    const tmuxSession = 'fake-session';

    // Mock execa to return some ANSI text
    vi.mocked(execa).mockResolvedValue({ stdout: '\x1b[31mHello\x1b[0m' } as never);

    // Mock Terminal
    const mockWrite = vi.fn((data, cb) => cb?.());
    const mockTerminal = {
      write: mockWrite,
      dispose: vi.fn(),
      buffer: {
        active: {
          length: 1,
          getLine: vi.fn().mockReturnValue({
            length: 5,
            getCell: vi.fn().mockImplementation(() => ({
              getChars: () => 'A',
              getFgColor: () => 1,
              getBgColor: () => 0,
              isBold: () => false,
              isItalic: () => false,
              isUnderline: () => false,
              isStrikethrough: () => false,
              isInverse: () => false,
              isDim: () => false,
            })),
          }),
        },
      },
    };

    vi.mocked(Terminal).mockImplementation(function () {
      return mockTerminal as never;
    } as never);

    // Mock resvg
    vi.mocked(Resvg).mockImplementation(function () {
      return {
        render: vi.fn().mockReturnValue({
          asPng: vi.fn().mockReturnValue(Buffer.from('fake-png')),
        }),
      };
    } as never);

    await strategy.capture(outputPath, cols, rows, tmuxSession);

    expect(execa).toHaveBeenCalledWith('tmux', ['capture-pane', '-t', tmuxSession, '-e', '-p']);
    expect(Terminal).toHaveBeenCalledWith({ allowProposedApi: true, cols, rows });
    expect(mockWrite).toHaveBeenCalledWith('\x1b[31mHello\x1b[0m', expect.any(Function));
    expect(Resvg).toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalledWith(outputPath, Buffer.from('fake-png'));
  });
});
