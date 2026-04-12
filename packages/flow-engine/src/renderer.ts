import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Terminal } from '@xterm/headless';
import { createCanvas, registerFont } from 'canvas';

async function findNerdFont(dir: string): Promise<string | null> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const result = await findNerdFont(fullPath);
        if (result) return result;
      } else if (entry.isFile()) {
        const name = entry.name.toLowerCase();
        if (name.includes('nerdfont') && name.endsWith('.ttf')) {
          return fullPath;
        }
      }
    }
  } catch {
    // Ignore errors (e.g., ENOENT, EACCES)
  }
  return null;
}

export async function detectNerdFont(): Promise<string | null> {
  const homedir = os.homedir();
  const paths: string[] = [];

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(homedir, 'AppData', 'Local');
    paths.push(path.join(localAppData, 'Microsoft', 'Windows', 'Fonts'));
    const winDir = process.env.WINDIR || 'C:\\Windows';
    paths.push(path.join(winDir, 'Fonts'));
  } else if (process.platform === 'darwin') {
    paths.push(path.join(homedir, 'Library', 'Fonts'));
    paths.push('/Library/Fonts');
    paths.push('/System/Library/Fonts');
  } else {
    paths.push(path.join(homedir, '.local', 'share', 'fonts'));
    paths.push('/usr/share/fonts');
    paths.push('/usr/local/share/fonts');
  }

  for (const dir of paths) {
    const fontPath = await findNerdFont(dir);
    if (fontPath) {
      try {
        registerFont(fontPath, { family: 'Nerd Font' });
        return fontPath;
      } catch {
        // Continue if canvas fails to register it
      }
    }
  }

  return null;
}

export class HeadlessRenderer {
  public terminal: Terminal;
  private cols: number;
  private rows: number;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;

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
