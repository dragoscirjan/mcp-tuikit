import { TerminalBackend, SessionHandler, SnapshotStrategy } from '@mcp-tuikit/core';
import { execa } from 'execa';
import { Browser, Page, chromium } from 'playwright';
import { loadXtermAssets } from './playwright-utils.js';

export class PlaywrightBackend extends TerminalBackend {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private disposeDataListener: (() => void) | null = null;

  constructor(sessionHandler: SessionHandler, snapshotStrategy: SnapshotStrategy) {
    super(sessionHandler, snapshotStrategy);
  }

  async connect(cmd: string, cols: number, rows: number): Promise<void> {
    const sessionId = await this.sessionHandler.createSession(cmd, cols, rows);
    this.sessionId = sessionId;
    this.innerSessionName = sessionId;

    const headless = process.env.TUIKIT_HEADLESS === '1';
    this.browser = await chromium.launch({ headless });
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
        allowProposedApi: true
      });
      window.term.open(document.getElementById('terminal'));
    </script>
  </body>
</html>`;

    await this.page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

    // 1. Initial ANSI dump from tmux (in case we missed early output)
    try {
      const { stdout } = await execa('tmux', ['capture-pane', '-t', sessionId, '-p', '-e']);
      if (stdout) {
        const base64Data = Buffer.from(stdout, 'utf-8').toString('base64');
        await this.page.evaluate((b64) => {
          const decodedData = atob(b64);
          const bytes = new Uint8Array(decodedData.length);
          for (let i = 0; i < decodedData.length; i++) {
            bytes[i] = decodedData.charCodeAt(i);
          }
          // @ts-ignore
          window.term.write(bytes);
        }, base64Data);
      }
    } catch {
      // Ignored
    }

    // 2. Real-time streaming from tmux pipe
    if (this.sessionHandler.onData) {
      const listener = this.sessionHandler.onData(sessionId, (data: string) => {
        if (!this.page) return;
        const base64Data = Buffer.from(data, 'utf-8').toString('base64');
        this.page
          .evaluate((b64) => {
            try {
              const decodedData = atob(b64);
              const bytes = new Uint8Array(decodedData.length);
              for (let i = 0; i < decodedData.length; i++) {
                bytes[i] = decodedData.charCodeAt(i);
              }
              // @ts-ignore
              window.term.write(bytes);
            } catch {
              // ignore
            }
          }, base64Data)
          .catch(() => {});
      });

      if (listener) {
        this.disposeDataListener = listener.dispose;
      }
    }
  }

  public async takeSnapshot(outputPath: string, format: 'png' | 'txt', cols: number, rows: number): Promise<void> {
    if (format === 'txt') {
      await super.takeSnapshot(outputPath, format, cols, rows);
      return;
    }

    if (!this.page) {
      throw new Error('Playwright page is not initialized. Cannot take PNG snapshot.');
    }

    // Small delay to ensure xterm.js has painted the latest ANSI chunks
    await new Promise((r) => setTimeout(r, 150));
    await this.page.locator('#terminal').screenshot({ path: outputPath });
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
    if (this.sessionId) {
      await this.sessionHandler.closeSession(this.sessionId).catch(() => {});
      this.sessionId = null;
    }
  }
}
