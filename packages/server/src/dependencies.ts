import { execSync } from 'node:child_process';
import * as os from 'node:os';
import { getBackendConfig } from '@dragoscirjan/mcp-tuikit-terminals';

export interface DependencyCheckResult {
  ok: boolean;
  missing: string[];
  installed: string[];
  details: string;
}

export function hasCommand(cmd: string): boolean {
  try {
    if (process.platform === 'win32') {
      execSync(`where ${cmd}`, { stdio: 'ignore' });
    } else {
      execSync(`which ${cmd}`, { stdio: 'ignore' });
    }
    return true;
  } catch {
    return false;
  }
}

export async function checkDependencies(): Promise<DependencyCheckResult> {
  const isLinux = os.platform() === 'linux';

  const terminal = getBackendConfig();
  const isXterm = terminal === 'xterm.js';
  const isHeadless = process.env.TUIKIT_HEADLESS === '1';

  const missing: string[] = [];
  const installed: string[] = [];

  if (!isXterm) {
    if (hasCommand('tmux')) {
      installed.push('tmux');
    } else {
      missing.push('tmux');
    }
  }

  if (isLinux && isHeadless && !isXterm) {
    const hasXvfb = hasCommand('Xvfb');
    const hasImport = hasCommand('import');
    const hasSway = hasCommand('sway');
    const hasGrim = hasCommand('grim');
    const hasKwin = hasCommand('kwin_wayland');
    const hasSpectacle = hasCommand('spectacle');

    let headlessOk = false;

    if (hasXvfb && hasImport) {
      headlessOk = true;
      installed.push('Xvfb', 'import (imagemagick)');
    } else if (hasSway && hasGrim) {
      headlessOk = true;
      installed.push('sway', 'grim');
    } else if (hasKwin && hasSpectacle) {
      headlessOk = true;
      installed.push('kwin_wayland', 'spectacle');
    }

    if (!headlessOk) {
      if (hasXvfb && !hasImport) missing.push('import (imagemagick)');
      else if (hasSway && !hasGrim) missing.push('grim');
      else if (hasKwin && !hasSpectacle) missing.push('spectacle');
      else missing.push('Xvfb+imagemagick', 'sway+grim', 'kwin_wayland+spectacle');
    }
  }

  return {
    ok: missing.length === 0,
    missing,
    installed,
    details: missing.length === 0 ? 'All dependencies met.' : `Missing dependencies: ${missing.join(', ')}`,
  };
}
