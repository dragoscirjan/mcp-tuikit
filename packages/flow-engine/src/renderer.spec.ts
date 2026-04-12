import { Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import { registerFont } from 'canvas';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { HeadlessRenderer, detectNerdFont } from './renderer.js';

vi.mock('node:fs/promises');
vi.mock('canvas', () => ({
  createCanvas: vi.fn(),
  registerFont: vi.fn(),
}));

describe('detectNerdFont', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should detect a font and register it', async () => {
    vi.mocked(fs.readdir).mockImplementation(async (dir) => {
      if (typeof dir === 'string' && dir.includes('Fonts')) {
        return [{ isDirectory: () => false, isFile: () => true, name: 'SomeNerdFont-Regular.ttf' } as Dirent];
      }
      return [];
    });

    const fontPath = await detectNerdFont();
    expect(fontPath).toBeDefined();
    expect(fontPath).toMatch(/SomeNerdFont-Regular\.ttf$/);
    expect(registerFont).toHaveBeenCalledWith(fontPath, { family: 'Nerd Font' });
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
});
