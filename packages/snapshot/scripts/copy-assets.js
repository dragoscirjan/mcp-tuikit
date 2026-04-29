import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const srcDir = join(process.cwd(), 'src');
const destDir = join(process.cwd(), 'dist');

mkdirSync(destDir, { recursive: true });

const files = readdirSync(srcDir).filter((f) => f.endsWith('.ps1'));
for (const file of files) {
  copyFileSync(join(srcDir, file), join(destDir, file));
}
