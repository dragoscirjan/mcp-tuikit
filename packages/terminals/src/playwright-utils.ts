import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);

/**
 * Resolve and inline the @xterm/xterm browser assets (CSS + JS) from the local
 * pnpm store so we never depend on an external CDN at runtime or in CI.
 *
 * Exported for unit testing.
 */
export async function loadXtermAssets(): Promise<{ css: string; js: string }> {
  const cssPath = require.resolve('@xterm/xterm/css/xterm.css');
  const jsPath = require.resolve('@xterm/xterm/lib/xterm.js');
  const [css, js] = await Promise.all([fs.readFile(cssPath, 'utf8'), fs.readFile(jsPath, 'utf8')]);
  return { css, js };
}

/**
 * Capture a terminal snapshot using a Playwright browser running xterm.js.
 * Assets are loaded from the local package store — no CDN required.
 *
 * Runs headed (visible window) by default so the rendered output can be
 * observed directly. Set TUIKIT_HEADLESS=1 to suppress the window, e.g.
 * in CI environments where no display is available.
 *
 * @param ansiData  The ANSI text to render.
 * @param outputPath  The path to save the screenshot.
 * @param cols  The number of terminal columns.
 * @param rows  The number of terminal rows.
 */
export async function capturePlaywrightSnapshot(
  ansiData: string,
  outputPath: string,
  cols: number,
  rows: number,
): Promise<void> {
  const { css, js } = await loadXtermAssets();

  const headless = process.env.TUIKIT_HEADLESS === '1';
  const browser = await chromium.launch({ headless });

  try {
    // viewport: null disables Playwright's viewport clipping entirely.
    // Without this, element screenshots on high-DPI (devicePixelRatio=2) displays
    // are cropped to the viewport bounds — cutting off the right/bottom of large
    // xterm.js canvases. null lets the page expand to its natural content size.
    const context = await browser.newContext({
      viewport: null,
    });
    const page = await context.newPage();

    const base64Data = Buffer.from(ansiData, 'utf-8').toString('base64');

    const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <style>${css}</style>
    <script>${js}</script>
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: #000000;
        display: inline-block;
        overflow: visible;
      }
      #terminal {
        display: inline-block;
        overflow: visible;
      }
    </style>
  </head>
  <body>
    <div id="terminal"></div>
    <script>
      const term = new window.Terminal({
        cols: ${cols},
        rows: ${rows},
        theme: { background: '#000000' },
        allowProposedApi: true,
        fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace'
      });
      term.open(document.getElementById('terminal'));

      const decodedData = atob('${base64Data}');
      const bytes = new Uint8Array(decodedData.length);
      for (let i = 0; i < decodedData.length; i++) {
        bytes[i] = decodedData.charCodeAt(i);
      }

      // Signal rendering complete via a DOM flag that Playwright can wait on
      window._xtermReady = false;
      term.write(bytes, () => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(() => { window._xtermReady = true; }, 50);
          });
        });
      });
    </script>
  </body>
</html>`;

    // No network I/O — domcontentloaded is sufficient since all assets are inlined
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

    // Wait for xterm.js to confirm all bytes are written and rendered.
    // The function string is evaluated inside the browser — not compiled by tsc.
    await page.waitForFunction('window._xtermReady === true', { timeout: 10000 });

    // Screenshot the full #terminal wrapper — contains both viewport and canvas
    await page.locator('#terminal').screenshot({ path: outputPath });
  } finally {
    await browser.close();
  }
}
