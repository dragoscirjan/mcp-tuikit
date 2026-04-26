import { TerminalBackend, SessionHandler, SnapshotStrategy } from '@mcp-tuikit/core';
import { TmuxSessionHandler } from '@mcp-tuikit/tmux';
import { Browser, Page, chromium } from 'playwright';
import { loadXtermAssets, getPlaywrightLaunchOptions } from './playwright-utils.js';

export class PlaywrightBackend extends TerminalBackend {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private disposeDataListener: (() => void) | null = null;

  constructor(sessionHandler: SessionHandler, snapshotStrategy: SnapshotStrategy) {
    super(sessionHandler, snapshotStrategy);
  }

  async connect(cmd: string, cols: number, rows: number): Promise<void> {
    const sessionId = await this.sessionHandler.createSession(cmd, cols, rows);
    this._sessionName = sessionId;

    const headless = process.env.TUIKIT_HEADLESS === '1';
    const launchOptions = await getPlaywrightLaunchOptions(headless);

    this.browser = await chromium.launch(launchOptions);
    const context = await this.browser.newContext({ viewport: null });
    this.page = await context.newPage();

    const { css, js } = await loadXtermAssets();
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
      window.term = new window.Terminal({
        cols: ${cols},
        rows: ${rows},
        theme: { background: '#000000' },
        allowProposedApi: true,
        fontFamily: '"SauceCodePro Nerd Font", Menlo, Monaco, Consolas, "Courier New", monospace'
      });
      window.term.open(document.getElementById('terminal'));
      window.writeBase64ToTerm = function(b64) {
        try {
          const decodedData = atob(b64);
          const bytes = new Uint8Array(decodedData.length);
          for (let i = 0; i < decodedData.length; i++) {
            bytes[i] = decodedData.charCodeAt(i);
          }
          if (window.term) window.term.write(bytes);
        } catch (e) {}
      };
    </script>
  </body>
</html>`;

    await this.page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

    // 1. Initial ANSI dump — write current screen state immediately so the
    //    browser shows content from the moment it opens.
    try {
      const ansi = await new TmuxSessionHandler().getScreenAnsi(sessionId);
      if (ansi && this.page) {
        const normalised = '\x1b[H' + ansi.replace(/\r?\n/g, '\r\n');
        const base64Data = Buffer.from(normalised, 'utf-8').toString('base64');
        // @ts-ignore
        await this.page.evaluate((b64) => window.writeBase64ToTerm(b64), base64Data);
      }
    } catch {
      // Ignored — browser will update via live stream below
    }

    // 2. Live streaming — keeps the browser updating as the terminal changes.
    //    Uses tmux pipe-pane (works without a PTY, unlike tmux -C attach).
    if (this.sessionHandler.onData) {
      const listener = this.sessionHandler.onData(sessionId, (data: string) => {
        if (!this.page) return;
        const base64Data = Buffer.from(data, 'utf-8').toString('base64');
        // @ts-ignore
        this.page.evaluate((b64) => window.writeBase64ToTerm(b64), base64Data).catch(() => {});
      });

      this.disposeDataListener = listener.dispose;
    }
  }

  public async takeSnapshot(outputPath: string, format: 'png' | 'txt', cols: number, rows: number): Promise<void> {
    // Delegate both txt and png to the base implementation.
    // For PNG, base calls snapshotStrategy.capture() which uses capturePlaywrightSnapshot()
    // — a fresh browser render with a proper _xtermReady callback. This avoids the
    // scrollback-shift bug where capture-pane line-feed output scrolls rows 0–11 off
    // the top of the live xterm.js viewport.
    await super.takeSnapshot(outputPath, format, cols, rows);
  }

  async disconnect(): Promise<void> {
    if (this.disposeDataListener) {
      this.disposeDataListener();
      this.disposeDataListener = null;
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
      this.page = null;
    }
    if (this._sessionName) {
      await this.sessionHandler.closeSession(this._sessionName).catch(() => {});
      this._sessionName = null;
    }
  }
}
