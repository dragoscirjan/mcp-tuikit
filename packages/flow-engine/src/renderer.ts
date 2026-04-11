import fs from 'node:fs/promises';
import { Terminal } from '@xterm/headless';
import { createCanvas, registerFont } from 'canvas';

export class HeadlessRenderer {
  public terminal: Terminal;
  private cols: number;
  private rows: number;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;

    // Register Nerd Fonts in canvas before xterm initialization as required by LLD
    try {
      // Best effort font loading for accurate dimensions in headless canvas
      registerFont('/usr/share/fonts/truetype/nerd-fonts/DroidSansMonoNerdFont-Regular.ttf', { family: 'Nerd Font' });
    } catch {
      // Ignored for environments without the font
    }

    this.terminal = new Terminal({
      cols,
      rows,
      allowProposedApi: true,
    });
  }

  public write(data: string | Uint8Array): Promise<void> {
    return new Promise((resolve) => {
      this.terminal.write(data, () => resolve());
    });
  }

  public async exportTxt(): Promise<string> {
    const buffer = this.terminal.buffer.active;
    const lines: string[] = [];
    for (let y = 0; y < this.terminal.rows; y++) {
      const line = buffer.getLine(y);
      if (line) {
        lines.push(line.translateToString(true).trimEnd());
      }
    }
    // Remove trailing empty lines
    while (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }
    return lines.join('\n');
  }

  public async exportJson(): Promise<Record<string, unknown>> {
    const content = await this.exportTxt();
    const active = this.terminal.buffer.active;
    return {
      content,
      cursor: {
        x: active.cursorX,
        y: active.cursorY,
      },
      dimensions: {
        cols: this.cols,
        rows: this.rows,
      },
    };
  }

  public async exportPng(outputPath: string): Promise<void> {
    const cellWidth = 10;
    const cellHeight = 20;
    const width = this.cols * cellWidth;
    const height = this.rows * cellHeight;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    ctx.font = '16px "Nerd Font", monospace';
    ctx.textBaseline = 'top';

    const buffer = this.terminal.buffer.active;
    for (let y = 0; y < this.terminal.rows; y++) {
      const line = buffer.getLine(y);
      if (!line) continue;
      for (let x = 0; x < this.terminal.cols; x++) {
        const cell = line.getCell(x);
        if (!cell) continue;
        const char = cell.getChars();
        if (!char || char === ' ') continue;

        // In a full implementation, we'd extract colors from cell.getFgColor()
        ctx.fillStyle = '#ffffff';
        ctx.fillText(char, x * cellWidth, y * cellHeight);
      }
    }

    const pngBuffer = canvas.toBuffer('image/png');
    await fs.writeFile(outputPath, pngBuffer);
  }
}
