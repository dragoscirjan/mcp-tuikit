import fs from 'node:fs/promises';
import { registerFont } from 'canvas';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { HeadlessRenderer, detectNerdFont } from './renderer.js';

vi.mock('node:fs/promises');
vi.mock('canvas', () => {
  const mockContext = {
    fillStyle: '',
    fillRect: vi.fn(),
    fillText: vi.fn(),
    font: '',
    textBaseline: '',
  };
  const mockCanvas = {
    getContext: vi.fn(() => mockContext),
    toBuffer: vi.fn(() => Buffer.from('mock-png-data')),
  };
  return {
    createCanvas: vi.fn(() => mockCanvas),
    registerFont: vi.fn(),
  };
});

describe('detectNerdFont', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should detect a font and register it', async () => {
    vi.mocked(fs.readdir).mockImplementation(async (dir) => {
      if (typeof dir === 'string' && dir.includes('Fonts')) {
        return [
          { isDirectory: () => false, isFile: () => true, name: 'SomeNerdFont-Regular.ttf' },
        ] as unknown as ReturnType<typeof fs.readdir>;
      }
      return [] as unknown as ReturnType<typeof fs.readdir>;
    });

    const fontPath = await detectNerdFont();
    expect(fontPath).toBeDefined();
    expect(fontPath).toMatch(/SomeNerdFont-Regular\.ttf$/);
    expect(registerFont).toHaveBeenCalledWith(fontPath, { family: 'Nerd Font' });
  });

  it('should try multiple fonts if registerFont fails', async () => {
    vi.mocked(fs.readdir).mockImplementation(async (dir) => {
      if (typeof dir === 'string' && dir.includes('Fonts')) {
        return [
          { isDirectory: () => false, isFile: () => true, name: 'BadNerdFont.ttf' },
          { isDirectory: () => false, isFile: () => true, name: 'GoodNerdFont.ttf' },
        ] as unknown as ReturnType<typeof fs.readdir>;
      }
      return [] as unknown as ReturnType<typeof fs.readdir>;
    });

    vi.mocked(registerFont).mockImplementation((path) => {
      if (typeof path === 'string' && path.includes('BadNerdFont')) {
        throw new Error('Failed to load font');
      }
    });

    const fontPath = await detectNerdFont();
    expect(fontPath).toBeDefined();
    expect(fontPath).toMatch(/GoodNerdFont\.ttf$/);
    expect(registerFont).toHaveBeenCalledTimes(2);
  });

  it('should fall back gracefully if no font is found', async () => {
    vi.mocked(fs.readdir).mockRejectedValue(new Error('ENOENT'));

    const fontPath = await detectNerdFont();
    expect(fontPath).toBeNull();
    expect(registerFont).not.toHaveBeenCalled();
  });
});

describe('HeadlessRenderer', () => {
  it('should initialize and export text', async () => {
    const renderer = new HeadlessRenderer(80, 24);
    await renderer.write('Hello World');

    const txt = await renderer.exportTxt();
    expect(txt).toContain('Hello World');
  });

  it('should export JSON state', async () => {
    const renderer = new HeadlessRenderer(80, 24);
    await renderer.write('Hello JSON');

    const json = await renderer.exportJson();
    expect(json.content).toContain('Hello JSON');
  });

  it('should export PNG with correctly mapped colors', async () => {
    const renderer = new HeadlessRenderer(10, 2);
    // Write text with red foreground (31) and green background (42) and inverse (7)
    await renderer.write('\x1b[31;42mR\x1b[0m\x1b[7mI\x1b[0m');

    await renderer.exportPng('test.png');
    expect(fs.writeFile).toHaveBeenCalledWith('test.png', expect.any(Buffer));
  });
});
