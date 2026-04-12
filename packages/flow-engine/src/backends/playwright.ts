import { chromium } from 'playwright';

/**
 * Capture a terminal snapshot using a headless Playwright browser running xterm.js.
 * @param ansiData The ANSI text to render.
 * @param outputPath The path to save the screenshot.
 * @param cols The number of terminal columns.
 * @param rows The number of terminal rows.
 */
export async function capturePlaywrightSnapshot(
  ansiData: string,
  outputPath: string,
  cols: number,
  rows: number,
): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  const buffer = Buffer.from(ansiData, 'utf-8');
  const base64Data = buffer.toString('base64');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/@xterm/xterm/css/xterm.css" />
        <script src="https://unpkg.com/@xterm/xterm/lib/xterm.js"></script>
        <style>
          body {
            margin: 0;
            padding: 0;
            background: black;
            display: inline-block;
          }
          #terminal {
            display: inline-block;
            padding: 10px;
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
            allowProposedApi: true
          });
          term.open(document.getElementById('terminal'));
          
          const decodedData = atob('${base64Data}');
          
          // Write to xterm
          term.write(decodedData);
        </script>
      </body>
    </html>
  `;

  // We load a data URL so we don't need a local server
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });

  // Give xterm.js a little time to finish rendering the text onto its canvas
  await page.waitForTimeout(500);

  // Take a screenshot of the terminal viewport element itself
  const terminalElement = page.locator('.xterm-viewport');
  // Fallback if not found, though xterm.js generates it
  const target = (await terminalElement.count()) > 0 ? terminalElement : page.locator('#terminal');

  await target.screenshot({ path: outputPath });

  await browser.close();
}
