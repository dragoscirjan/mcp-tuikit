import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Terminal } from '@xterm/headless';
import { createCanvas, registerFont } from 'canvas';

async function* findNerdFont(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err: unknown) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === 'ENOENT' || nodeErr.code === 'EACCES') {
      return;
    }
    throw err;
  }

  const dirs: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      dirs.push(fullPath);
    } else if (entry.isFile()) {
      const name = entry.name.toLowerCase();
      if (name.includes('nerdfont') && name.endsWith('.ttf')) {
        yield fullPath;
      }
    }
  }

  const subDirPromises = dirs.map(async (d) => {
    const results: string[] = [];
    for await (const font of findNerdFont(d)) {
      results.push(font);
    }
    return results;
  });

  const subDirResults = await Promise.all(subDirPromises);
  for (const results of subDirResults) {
    for (const font of results) {
      yield font;
    }
  }
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
    for await (const fontPath of findNerdFont(dir)) {
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

const PALETTE: string[] = (() => {
  const palette: string[] = [
    '#000000',
    '#cd0000',
    '#00cd00',
    '#cdcd00',
    '#0000ee',
    '#cd00cd',
    '#00cdcd',
    '#e5e5e5', // 0-7
    '#7f7f7f',
    '#ff0000',
    '#00ff00',
    '#ffff00',
    '#5c5cff',
    '#ff00ff',
    '#00ffff',
    '#ffffff', // 8-15
  ];

  // Generate the 6x6x6 color cube (indices 16-231)
  const levels = [0, 95, 135, 175, 215, 255];
  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        const rgb = (levels[r] << 16) | (levels[g] << 8) | levels[b];
        palette.push(`#${rgb.toString(16).padStart(6, '0')}`);
      }
    }
  }

  // Generate the 24 grayscale colors (indices 232-255)
  for (let i = 0; i < 24; i++) {
    const level = 8 + i * 10;
    const rgb = (level << 16) | (level << 8) | level;
    palette.push(`#${rgb.toString(16).padStart(6, '0')}`);
  }

  return palette;
})();

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

        let fgColor = '#ffffff';
        let bgColor = '#000000';

        if (cell.isFgRGB()) {
          fgColor = `#${cell.getFgColor().toString(16).padStart(6, '0')}`;
        } else if (cell.isFgPalette()) {
          fgColor = PALETTE[cell.getFgColor()] || '#ffffff';
        }

        if (cell.isBgRGB()) {
          bgColor = `#${cell.getBgColor().toString(16).padStart(6, '0')}`;
        } else if (cell.isBgPalette()) {
          bgColor = PALETTE[cell.getBgColor()] || '#000000';
        }

        if (cell.isInverse()) {
          const temp = fgColor;
          fgColor = bgColor;
          bgColor = temp;
        }

        if (bgColor !== '#000000') {
          ctx.fillStyle = bgColor;
          ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
        }

        const char = cell.getChars();
        if (!char || char === ' ') continue;

        ctx.fillStyle = fgColor;
        ctx.fillText(char, x * cellWidth, y * cellHeight);
      }
    }

    const pngBuffer = canvas.toBuffer('image/png');
    await fs.writeFile(outputPath, pngBuffer);
  }
}
