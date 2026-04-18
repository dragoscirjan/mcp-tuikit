import { promises as fs } from 'node:fs';
import { SnapshotStrategy } from '@mcp-tuikit/core';
import { Resvg } from '@resvg/resvg-js';
import headlessPkg from '@xterm/headless';
import type { Terminal } from '@xterm/headless';
const { Terminal: HeadlessTerminal } = headlessPkg as unknown as { Terminal: new (options: unknown) => Terminal };
import { execa } from 'execa';

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
    const pngBuffer = new Resvg(svgString).render().asPng();
    await fs.writeFile(outputPath, pngBuffer);
  }

  private generateSvg(term: Terminal, cols: number, rows: number): string {
    const charWidth = 10;
    const charHeight = 20;
    const width = cols * charWidth;
    const height = rows * charHeight;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
    svg += `<rect width="${width}" height="${height}" fill="#000000" />`;
    svg += `<g font-family="monospace" font-size="14" fill="#ffffff">`;

    for (let y = 0; y < rows; y++) {
      const line = term.buffer.active.getLine(y);
      if (!line) continue;

      for (let x = 0; x < cols; x++) {
        const cell = line.getCell(x);
        if (!cell) continue;

        const char = cell.getChars();
        if (char && char !== ' ') {
          svg += `<text x="${x * charWidth}" y="${(y + 1) * charHeight - 4}">${this.escapeXml(char)}</text>`;
        }
      }
    }

    svg += `</g></svg>`;
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
