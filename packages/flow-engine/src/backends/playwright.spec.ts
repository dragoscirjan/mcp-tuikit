/**
 * Unit tests for packages/flow-engine/src/backends/playwright.ts
 *
 * These tests verify:
 *   1. loadXtermAssets reads real local files — never fetches from a CDN
 *   2. capturePlaywrightSnapshot builds the correct HTML (local assets inlined)
 *   3. capturePlaywrightSnapshot uses domcontentloaded, not networkidle
 *   4. The browser is always closed, even if screenshot throws
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Playwright chromium mock ─────────────────────────────────────────────────
// vi.mock factories are hoisted to the top of the file, so the mock objects
// must also be hoisted via vi.hoisted to avoid TDZ reference errors.

const {
  mockScreenshot,
  mockLocator,
  mockWaitForFunction,
  mockSetContent,
  mockNewPage,
  mockNewContext,
  mockClose,
  mockLaunch,
} = vi.hoisted(() => {
  const mockScreenshot = vi.fn().mockResolvedValue(undefined);
  const mockLocator = vi.fn().mockReturnValue({ screenshot: mockScreenshot });
  const mockWaitForFunction = vi.fn().mockResolvedValue(undefined);
  const mockSetContent = vi.fn().mockResolvedValue(undefined);
  const mockNewPage = vi.fn().mockResolvedValue({
    setContent: mockSetContent,
    waitForFunction: mockWaitForFunction,
    locator: mockLocator,
  });
  const mockNewContext = vi.fn().mockResolvedValue({ newPage: mockNewPage });
  const mockClose = vi.fn().mockResolvedValue(undefined);
  const mockLaunch = vi.fn().mockResolvedValue({ newContext: mockNewContext, close: mockClose });
  return {
    mockScreenshot,
    mockLocator,
    mockWaitForFunction,
    mockSetContent,
    mockNewPage,
    mockNewContext,
    mockClose,
    mockLaunch,
  };
});

vi.mock('playwright', () => ({
  chromium: { launch: mockLaunch },
}));

// ── Subject under test ───────────────────────────────────────────────────────
import { loadXtermAssets, capturePlaywrightSnapshot } from './playwright.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Capture the HTML string passed to page.setContent on the most recent call. */
function lastHtml(): string {
  return mockSetContent.mock.calls.at(-1)?.[0] as string;
}

function lastSetContentOptions(): Record<string, unknown> {
  return mockSetContent.mock.calls.at(-1)?.[1] as Record<string, unknown>;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('loadXtermAssets', () => {
  it('resolves xterm.js and xterm.css from the local pnpm store (no CDN)', async () => {
    const { css, js } = await loadXtermAssets();

    // Both strings must be non-trivially long (real bundle files)
    expect(css.length).toBeGreaterThan(100);
    expect(js.length).toBeGreaterThan(1000);

    // Must NOT reference any CDN hostname
    expect(css).not.toMatch(/unpkg\.com|cdn\.jsdelivr|cdnjs/);
    expect(js).not.toMatch(/unpkg\.com|cdn\.jsdelivr|cdnjs/);
  });

  it('returns CSS that looks like a stylesheet (contains terminal selectors)', async () => {
    const { css } = await loadXtermAssets();
    // xterm.css always contains .xterm rule
    expect(css).toMatch(/\.xterm/);
  });

  it('returns JS that contains the xterm Terminal constructor', async () => {
    const { js } = await loadXtermAssets();
    expect(js).toMatch(/Terminal/);
  });

  it('reads from a real file on disk, not a network resource', async () => {
    // If the package were missing this would reject — confirm path is accessible
    const { createRequire } = await import('node:module');
    const req = createRequire(import.meta.url);
    const cssPath = req.resolve('@xterm/xterm/css/xterm.css');
    const jsPath = req.resolve('@xterm/xterm/lib/xterm.js');

    // Both paths should be absolute local paths
    expect(path.isAbsolute(cssPath)).toBe(true);
    expect(path.isAbsolute(jsPath)).toBe(true);

    // Confirm the files actually exist on disk
    await expect(fs.access(cssPath)).resolves.toBeUndefined();
    await expect(fs.access(jsPath)).resolves.toBeUndefined();
  });
});

describe('capturePlaywrightSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-apply mocks cleared by clearAllMocks
    mockScreenshot.mockResolvedValue(undefined);
    mockLocator.mockReturnValue({ screenshot: mockScreenshot });
    mockWaitForFunction.mockResolvedValue(undefined);
    mockSetContent.mockResolvedValue(undefined);
    mockNewPage.mockResolvedValue({
      setContent: mockSetContent,
      waitForFunction: mockWaitForFunction,
      locator: mockLocator,
    });
    mockNewContext.mockResolvedValue({ newPage: mockNewPage });
    mockClose.mockResolvedValue(undefined);
    mockLaunch.mockResolvedValue({ newContext: mockNewContext, close: mockClose });
  });

  it('launches chromium headed by default (TUIKIT_HEADLESS not set)', async () => {
    delete process.env.TUIKIT_HEADLESS;
    await capturePlaywrightSnapshot('hello', '/tmp/test.png', 80, 24);
    expect(mockLaunch).toHaveBeenCalledWith({ headless: false });
  });

  it('launches chromium headless when TUIKIT_HEADLESS=1', async () => {
    process.env.TUIKIT_HEADLESS = '1';
    try {
      await capturePlaywrightSnapshot('hello', '/tmp/test.png', 80, 24);
      expect(mockLaunch).toHaveBeenCalledWith({ headless: true });
    } finally {
      delete process.env.TUIKIT_HEADLESS;
    }
  });

  it('uses domcontentloaded — not networkidle', async () => {
    await capturePlaywrightSnapshot('hello', '/tmp/test.png', 80, 24);
    expect(lastSetContentOptions()).toMatchObject({ waitUntil: 'domcontentloaded' });
  });

  it('does NOT reference any CDN URL in the generated HTML', async () => {
    await capturePlaywrightSnapshot('hello world', '/tmp/test.png', 80, 24);
    const html = lastHtml();
    expect(html).not.toMatch(/unpkg\.com|cdn\.jsdelivr|cdnjs/);
  });

  it('inlines xterm CSS into a <style> tag (no <link> to external file)', async () => {
    await capturePlaywrightSnapshot('hello', '/tmp/test.png', 80, 24);
    const html = lastHtml();
    expect(html).toMatch(/<style>/);
    expect(html).not.toMatch(/<link[^>]+xterm/);
  });

  it('inlines xterm JS into a <script> tag (no src= pointing to a file)', async () => {
    await capturePlaywrightSnapshot('hello', '/tmp/test.png', 80, 24);
    const html = lastHtml();
    // Inline <script> contains actual JS — check for Terminal constructor presence
    expect(html).toMatch(/<script>[\s\S]*Terminal[\s\S]*<\/script>/);
  });

  it('passes cols and rows to the Terminal constructor in the HTML', async () => {
    await capturePlaywrightSnapshot('data', '/tmp/test.png', 132, 50);
    const html = lastHtml();
    expect(html).toContain('cols: 132');
    expect(html).toContain('rows: 50');
  });

  it('base64-encodes the ANSI data before embedding it in HTML', async () => {
    const ansi = '\x1b[31mred\x1b[0m';
    await capturePlaywrightSnapshot(ansi, '/tmp/test.png', 80, 24);
    const html = lastHtml();
    const expected = Buffer.from(ansi, 'utf-8').toString('base64');
    expect(html).toContain(expected);
  });

  it('saves the screenshot to the provided output path via #terminal', async () => {
    await capturePlaywrightSnapshot('hello', '/tmp/snapshot.png', 80, 24);
    expect(mockLocator).toHaveBeenCalledWith('#terminal');
    expect(mockScreenshot).toHaveBeenCalledWith({ path: '/tmp/snapshot.png' });
  });

  it('always closes the browser even when screenshot throws', async () => {
    mockScreenshot.mockRejectedValueOnce(new Error('screenshot failed'));
    await expect(capturePlaywrightSnapshot('hello', '/tmp/err.png', 80, 24)).rejects.toThrow('screenshot failed');
    expect(mockClose).toHaveBeenCalled();
  });

  it('waits for _xtermReady before taking the screenshot', async () => {
    await capturePlaywrightSnapshot('hello', '/tmp/test.png', 80, 24);
    expect(mockWaitForFunction).toHaveBeenCalledWith('window._xtermReady === true', { timeout: 10000 });
    // waitForFunction must be called before screenshot
    const waitOrder = mockWaitForFunction.mock.invocationCallOrder[0];
    const screenshotOrder = mockScreenshot.mock.invocationCallOrder[0];
    expect(waitOrder).toBeLessThan(screenshotOrder);
  });
});
