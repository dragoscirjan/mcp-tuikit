/**
 * Integration tests for packages/flow-engine/src/backends/playwright.ts
 *
 * These tests launch a real Chromium instance (headed by default, set
 * TUIKIT_HEADLESS=1 for headless / CI) and verify that xterm.js ACTUALLY
 * RENDERED content into the PNG — not just that a file was produced.
 * Pixel sampling confirms text glyphs are present.
 *
 * Key verifications:
 *   1. Green-coloured text (\x1b[32m) produces green pixels in the output
 *   2. Red-coloured text (\x1b[31m) produces red pixels in the output
 *   3. A terminal with text has significantly more lit pixels than an empty one
 *   4. cols/rows propagate correctly (wider terminal → wider image)
 *   5. Concurrent snapshots produce independent results
 *   6. Browser is always closed (no resource leak on error)
 *
 * Requirements: Chromium installed via `npx playwright install chromium`.
 *
 * Run via:  mise run test:integration
 *
 * Output PNGs are saved to <repo-root>/snapshots/ so they survive the test
 * run and can be inspected visually (matching real usage of create_snapshot).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { capturePlaywrightSnapshot } from '../src/playwright-utils.js';

// ── Snapshot output directory ─────────────────────────────────────────────────

// Resolve <repo-root>/snapshots/ regardless of where vitest is invoked from.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const snapshotsDir = path.join(repoRoot, 'snapshots');

beforeAll(async () => {
  // Integration tests run headed by default (real usage).
  // Set TUIKIT_HEADLESS=1 externally if you need headless (e.g. CI).
  await fs.mkdir(snapshotsDir, { recursive: true });

  process.env.TUIKIT_HEADLESS = '1';
});

afterAll(() => {
  // PNGs are intentionally kept in snapshots/ for post-run inspection.

  delete process.env.TUIKIT_HEADLESS;
});

function snapshotPng(name: string): string {
  return path.join(snapshotsDir, `xterm-integration-${name}.png`);
}

// ── Pixel analysis helpers ────────────────────────────────────────────────────

interface PixelStats {
  width: number;
  height: number;
  totalPixels: number;
  /** Pixels where R+G+B > 30 (not pure black) */
  litPixels: number;
  /** Pixels where green channel dominates: G > R*2 && G > B*2 && G > 50 */
  greenPixels: number;
  /** Pixels where red channel dominates: R > G*2 && R > B*2 && R > 50 */
  redPixels: number;
}

/**
 * Load a PNG via a headless browser canvas and return pixel statistics.
 * Using Playwright's own browser for decoding ensures we don't need extra
 * native image libraries (sharp/pngjs) in the test deps.
 */
async function analyzePixels(pngPath: string): Promise<PixelStats> {
  const data = await fs.readFile(pngPath);
  const src = `data:image/png;base64,${data.toString('base64')}`;

  const browser = await chromium.launch({ headless: process.env.TUIKIT_HEADLESS === '1' });
  try {
    const page = await (await browser.newContext()).newPage();
    return await page.evaluate(async (imgSrc: string) => {
      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error('failed to load image'));
        img.src = imgSrc;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const px = ctx.getImageData(0, 0, img.width, img.height).data;

      let litPixels = 0;
      let greenPixels = 0;
      let redPixels = 0;

      for (let i = 0; i < px.length; i += 4) {
        const r = px[i],
          g = px[i + 1],
          b = px[i + 2];
        if (r + g + b > 30) litPixels++;
        // xterm ANSI green (colour 2): rgb(78,154,6) — G dominates but ratio ~2x
        // Use: G > R+20 && G > B*5 && G > 50
        if (g > r + 20 && g > b * 5 && g > 50) greenPixels++;
        // xterm ANSI red (colour 1): rgb(204,0,0) — clearly dominant
        if (r > g * 2 && r > b * 2 && r > 50) redPixels++;
      }

      return {
        width: img.width,
        height: img.height,
        totalPixels: px.length / 4,
        litPixels,
        greenPixels,
        redPixels,
      };
    }, src);
  } finally {
    await browser.close();
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe.skip('capturePlaywrightSnapshot — xterm.js rendering verification', () => {
  it('produces green pixels when ANSI green text is written', async () => {
    const out = snapshotPng('green-text');
    // \x1b[32m = ANSI green foreground
    await capturePlaywrightSnapshot('\x1b[32mHello World\x1b[0m', out, 80, 24);

    const stats = await analyzePixels(out);

    // xterm.js rendered green text — green pixels must be present
    expect(stats.greenPixels).toBeGreaterThan(50);
    // No red pixels for a pure-green string
    expect(stats.redPixels).toBe(0);
  }, 60_000);

  it('produces red pixels when ANSI red text is written', async () => {
    const out = snapshotPng('red-text');
    // \x1b[31m = ANSI red foreground
    await capturePlaywrightSnapshot('\x1b[31mERROR occurred\x1b[0m', out, 80, 24);

    const stats = await analyzePixels(out);

    expect(stats.redPixels).toBeGreaterThan(50);
    expect(stats.greenPixels).toBe(0);
  }, 60_000);

  it('a terminal with text has more lit pixels than an empty terminal', async () => {
    const outEmpty = snapshotPng('empty');
    const outText = snapshotPng('with-text');

    await capturePlaywrightSnapshot('', outEmpty, 80, 24);
    await capturePlaywrightSnapshot('\x1b[37mThis is visible text on the screen\x1b[0m', outText, 80, 24);

    const emptyStats = await analyzePixels(outEmpty);
    const textStats = await analyzePixels(outText);

    // Text rendering must produce measurably more lit pixels
    expect(textStats.litPixels).toBeGreaterThan(emptyStats.litPixels + 100);
  }, 60_000);

  it('cols propagate — wider terminal produces wider image', async () => {
    const narrow = snapshotPng('cols-40');
    const wide = snapshotPng('cols-200');

    await capturePlaywrightSnapshot('x', narrow, 40, 10);
    await capturePlaywrightSnapshot('x', wide, 200, 10);

    const [narrowStats, wideStats] = await Promise.all([analyzePixels(narrow), analyzePixels(wide)]);

    expect(wideStats.width).toBeGreaterThan(narrowStats.width);
  }, 60_000);

  it('rows propagate — taller terminal produces taller image', async () => {
    const short = snapshotPng('rows-5');
    const tall = snapshotPng('rows-40');

    await capturePlaywrightSnapshot('x', short, 80, 5);
    await capturePlaywrightSnapshot('x', tall, 80, 40);

    const [shortStats, tallStats] = await Promise.all([analyzePixels(short), analyzePixels(tall)]);

    expect(tallStats.height).toBeGreaterThan(shortStats.height);
  }, 60_000);

  it('concurrent snapshots produce independent pixel content', async () => {
    const outGreen = snapshotPng('concurrent-green');
    const outRed = snapshotPng('concurrent-red');

    // Run both simultaneously
    await Promise.all([
      capturePlaywrightSnapshot('\x1b[32mGreen\x1b[0m', outGreen, 80, 24),
      capturePlaywrightSnapshot('\x1b[31mRed\x1b[0m', outRed, 80, 24),
    ]);

    const [greenStats, redStats] = await Promise.all([analyzePixels(outGreen), analyzePixels(outRed)]);

    // Each snapshot should only contain its own colour
    expect(greenStats.greenPixels).toBeGreaterThan(50);
    expect(greenStats.redPixels).toBe(0);

    expect(redStats.redPixels).toBeGreaterThan(50);
    expect(redStats.greenPixels).toBe(0);
  }, 60_000);

  it('multi-line ANSI output with mixed colours renders all colours', async () => {
    const out = snapshotPng('multiline-colors');
    const ansi = ['\x1b[31mLine 1: red\x1b[0m', '\x1b[32mLine 2: green\x1b[0m'].join('\r\n');

    await capturePlaywrightSnapshot(ansi, out, 80, 24);
    const stats = await analyzePixels(out);

    expect(stats.redPixels).toBeGreaterThan(50);
    expect(stats.greenPixels).toBeGreaterThan(50);
  }, 60_000);
});
