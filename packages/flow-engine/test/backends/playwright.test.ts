import path from 'node:path';
import fs from 'fs-extra';
import { describe, it, expect } from 'vitest';
import { capturePlaywrightSnapshot } from '../../src/backends/playwright';

describe('playwright backend', () => {
  it('should generate a snapshot image', async () => {
    const outputPath = path.join(__dirname, 'output.png');

    // Clean up before
    if (await fs.pathExists(outputPath)) {
      await fs.remove(outputPath);
    }

    const ansiData = '\x1b[31mHello Playwright\x1b[0m';

    await capturePlaywrightSnapshot(ansiData, outputPath, 80, 24);

    expect(await fs.pathExists(outputPath)).toBe(true);

    // Clean up after
    await fs.remove(outputPath);
  }, 30000);
});
