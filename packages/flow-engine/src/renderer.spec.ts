import { describe, it, expect } from 'vitest';
import { HeadlessRenderer } from './renderer.js';

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
