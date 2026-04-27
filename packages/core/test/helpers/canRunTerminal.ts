import { execSync } from 'node:child_process';
import { Terminal } from '@mcp-tuikit/terminals';
import { describe } from 'vitest';

export interface RunBackendOptions {
  /** Label for the test suite */
  label?: string;
  /** Terminal backend to use (sets TUIKIT_TERMINAL env var). */
  terminal: Terminal;
  /** Number of columns for the spawned terminal. Defaults to 120. */
  cols?: number;
  /** Number of rows for the spawned terminal. Defaults to 40. */
  rows?: number;
  /** How to handle this specific test */
  run?: '' | 'skip' | 'only' | 'missing-binary' | 'wrong-os';
}

function hasBinary(bin: string): boolean {
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

export function canRunTerminal(terminal: RunBackendOptions['terminal']): RunBackendOptions['run'] {
  const target = process.env.TUIKIT_TERMINAL_TEST;
  switch (terminal) {
    case 'alacritty':
      return target === 'alacritty' ? 'only' : hasBinary('alacritty') ? '' : 'missing-binary';
    case 'xterm.js':
      return target === 'xterm.js' ? 'only' : '';
    case 'wezterm':
      return target === 'wezterm' ? 'only' : hasBinary('wezterm') ? '' : 'missing-binary';
    case 'kitty':
      return process.platform === 'win32'
        ? 'wrong-os'
        : !hasBinary('kitty')
          ? 'missing-binary'
          : target === 'kitty'
            ? 'only'
            : '';
    case 'konsole':
      return process.platform !== 'linux'
        ? 'wrong-os'
        : !hasBinary('konsole')
          ? 'missing-binary'
          : target === 'konsole'
            ? 'only'
            : '';
    case 'gnome-terminal':
      return process.platform !== 'linux'
        ? 'wrong-os'
        : !hasBinary('gnome-terminal')
          ? 'missing-binary'
          : target === 'gnome-terminal'
            ? 'only'
            : '';
    case 'iterm2':
      return process.platform !== 'darwin' ? 'wrong-os' : target === 'iterm2' ? 'only' : '';
    case 'macos-terminal':
      return process.platform !== 'darwin' ? 'wrong-os' : target === 'macos-terminal' ? 'only' : '';
    case 'ghostty':
      return process.platform === 'win32'
        ? 'wrong-os'
        : !hasBinary('ghostty')
          ? 'missing-binary'
          : target === 'ghostty'
            ? 'only'
            : '';
    case 'windows-terminal':
      return process.platform !== 'win32' ? 'wrong-os' : target === 'windows-terminal' ? 'only' : '';
    case 'powershell':
      return process.platform !== 'win32' ? 'wrong-os' : target === 'powershell' ? 'only' : '';
    case 'pwsh':
      return process.platform !== 'win32'
        ? 'wrong-os'
        : target === 'pwsh'
          ? 'only'
          : hasBinary('pwsh')
            ? ''
            : 'missing-binary';
    case 'cmd':
      return process.platform !== 'win32' ? 'wrong-os' : target === 'cmd' ? 'only' : '';
    default:
      return 'skip';
  }
}

export function getTerminalTestSuite(terminal: Terminal, baseLabel: string) {
  const run = canRunTerminal(terminal);
  let d = describe;
  let finalLabel = baseLabel;

  if (run === 'skip') {
    d = describe.skip as typeof describe;
  } else if (run === 'only') {
    d = describe.only as typeof describe;
  } else if (run === 'missing-binary') {
    d = describe.skip as typeof describe;
    finalLabel += ' [UNAVAILABLE: binary missing]';
  } else if (run === 'wrong-os') {
    d = describe.skip as typeof describe;
    finalLabel += ' [SKIPPED: wrong OS]';
  }

  return { d, label: finalLabel, run };
}
