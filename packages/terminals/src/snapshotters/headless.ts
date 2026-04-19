import { promises as fs } from 'node:fs';
import { SnapshotStrategy } from '@mcp-tuikit/core';
import { Resvg } from '@resvg/resvg-js';
import headlessPkg from '@xterm/headless';
import type { Terminal } from '@xterm/headless';
import { execa } from 'execa';

const { Terminal: HeadlessTerminal } = headlessPkg as unknown as { Terminal: new (options: unknown) => Terminal };

export class HeadlessSnapshotStrategy implements SnapshotStrategy {
  async capture(
    outputPath: string,
    cols: number,
    rows: number,
    tmuxSession: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _spawnResult?: unknown,
  ): Promise<void> {
    const result = await execa('tmux', ['capture-pane', '-t', tmuxSession, '-e', '-p']);
    const ansiText = result.stdout;

    const term = new HeadlessTerminal({ allowProposedApi: true, cols, rows });

    await new Promise<void>((resolve) => {
      term.write(ansiText, resolve);
    });

    const svgString = this.generateSvg(term, cols, rows);
    const pngBuffer = new Resvg(svgString, {
      font: {
        defaultFontFamily: 'monospace',
      },
    })
      .render()
      .asPng();

    await fs.writeFile(outputPath, pngBuffer);
  }

  private resolveColor(mode: number, value: number, def: string): string {
    if (mode === 0) return def;

    // Palette (16 color or 256 color)
    if (mode === 16777216 || mode === 33554432) {
      if (value < 16) {
        const ansi16 = [
          '#000000',
          '#cd3131',
          '#0dbc79',
          '#e5e510',
          '#2472c8',
          '#bc3fbc',
          '#11a8cd',
          '#e5e5e5',
          '#666666',
          '#f14c4c',
          '#23d18b',
          '#f5f543',
          '#3b8eea',
          '#d670d6',
          '#29b8db',
          '#ffffff',
        ];
        return ansi16[value];
      }
      if (value >= 16 && value <= 231) {
        const i = value - 16;
        const r = Math.floor(i / 36);
        const g = Math.floor((i % 36) / 6);
        const b = i % 6;
        const map = [0, 95, 135, 175, 215, 255];
        return `#${map[r].toString(16).padStart(2, '0')}${map[g].toString(16).padStart(2, '0')}${map[b].toString(16).padStart(2, '0')}`;
      }
      if (value >= 232 && value <= 255) {
        const gray = 8 + (value - 232) * 10;
        const hex = gray.toString(16).padStart(2, '0');
        return `#${hex}${hex}${hex}`;
      }
    }

    // RGB
    if (mode === 50331648) {
      const hex = value.toString(16).padStart(6, '0');
      return `#${hex}`;
    }

    return def;
  }

  private generateSvg(term: Terminal, cols: number, rows: number): string {
    const charWidth = 9.0;
    const charHeight = 17.0;
    const width = cols * charWidth;
    const height = rows * charHeight;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
    svg += `<style>
      text {
        font-family: monospace, "Courier New", Courier;
        font-size: 14px;
        white-space: pre;
      }
    </style>`;
    svg += `<rect width="${width}" height="${height}" fill="#000000" />`;

    let bgSvg = '';
    let textSvg = '';

    for (let y = 0; y < rows; y++) {
      const line = term.buffer.active.getLine(y);
      if (!line) continue;

      for (let x = 0; x < cols; x++) {
        const cell = line.getCell(x);
        if (!cell) continue;

        const char = cell.getChars();
        if (!char) continue;

        const fgMode = cell.getFgColorMode();
        const fgColor = cell.getFgColor();
        const bgMode = cell.getBgColorMode();
        const bgColor = cell.getBgColor();
        const isBold = cell.isBold();
        const isInverse = cell.isInverse();

        let resolvedFg = this.resolveColor(fgMode, fgColor, '#e5e5e5');
        let resolvedBg = this.resolveColor(bgMode, bgColor, '#000000');

        if (isInverse) {
          const temp = resolvedFg;
          resolvedFg = resolvedBg;
          resolvedBg = temp;
        }

        if (resolvedBg !== '#000000') {
          // Add a slight overlap to prevent bleeding borders
          bgSvg += `<rect x="${x * charWidth}" y="${y * charHeight}" width="${charWidth + 0.5}" height="${charHeight + 0.5}" fill="${resolvedBg}" />`;
        }

        if (char !== ' ') {
          const fontWeight = isBold ? 'bold' : 'normal';
          const dy = (y + 1) * charHeight - 4; // Baseline adjustment
          textSvg += `<text x="${x * charWidth}" y="${dy}" fill="${resolvedFg}" font-weight="${fontWeight}">${this.escapeXml(char)}</text>`;
        }
      }
    }

    svg += bgSvg;
    svg += textSvg;
    svg += `</svg>`;
    return svg;
  }

  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '&':
          return '&amp;';
        case "'":
          return '&apos;';
        case '"':
          return '&quot;';
        default:
          return c;
      }
    });
  }
}
