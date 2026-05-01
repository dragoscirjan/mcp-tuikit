/* jscpd:ignore-start */
import { execSync } from 'node:child_process';

export function hasBinary(bin: string): boolean {
  try {
    if (process.platform === 'win32') {
      execSync(`where ${bin}`, { stdio: 'ignore' });
    } else {
      execSync(`which ${bin}`, { stdio: 'ignore' });
    }
    return true;
  } catch {
    return false;
  }
}
/* jscpd:ignore-end */
