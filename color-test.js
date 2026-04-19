import headlessPkg from '@xterm/headless';
const { Terminal } = headlessPkg;
const term = new Terminal({ allowProposedApi: true, cols: 80, rows: 24 });

term.write('\x1b[31mRed Text\x1b[0m \x1b[38;2;255;100;50mRGB Text\x1b[0m \x1b[38;5;201mPalette 201\x1b[0m\n', () => {
  const line = term.buffer.active.getLine(0);

  const tests = [0, 9, 18];
  tests.forEach((x) => {
    const cell = line.getCell(x);
    console.log(`Cell at ${x}: char=${cell.getChars()} fgMode=${cell.getFgColorMode()} fgColor=${cell.getFgColor()}`);
  });
});
