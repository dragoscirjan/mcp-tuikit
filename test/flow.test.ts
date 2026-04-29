/** global process */

/**
 * Integration tests for run_flow via FlowRunner — covers iTerm2, Alacritty, WezTerm, Ghostty, and xterm.js.
 *
 * All ten flows (5 terminals × 2 apps) are executed sequentially in a single
 * top-level beforeAll so that terminal sessions never race each other.
 * All snapshots land in the same snapshots/ directory, distinguished by nanoid hash.
 *
 * xterm.js is the primary/default backend — works on every OS without native
 * terminal installs.  The remaining four suites (iTerm2, Alacritty, WezTerm,
 * Ghostty) are macOS-only opt-ins that require those apps to be installed and
 * Accessibility permissions granted to the runner process (System Events).
 *
 * Requirements:
 *   - nvim and btop installed and on PATH
 *   - TUIKIT_HEADLESS=1 if running xterm.js backend in CI (headed by default)
 *   - macOS with iTerm2, Alacritty, WezTerm, and Ghostty for native suites
 *
 * Run via:
 *   mise run test:integration
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { beforeAll } from 'vitest';
import { defineFlowSuite, FlowSuiteOptions } from './helpers/flowSuite.js';
import { canRunTerminal } from './packages/spawn/test/helpers/canRunTerminal';
import { hasBinary } from './packages/spawn/test/helpers/hasBinary';

const SNAPSHOTS = path.resolve(import.meta.dirname, '..', 'snapshots');

beforeAll(async () => {
  await fs.rm(SNAPSHOTS, { recursive: true, force: true }).catch(() => {});
}, 900_000);

// ── Suites ────────────────────────────────────────────────────────────────────

function defineTerminalFlowSuites(opts: Omit<FlowSuiteOptions, 'headless' | 'displayServer'>) {
  const { terminal } = opts;
  const baseRun = opts.run || canRunTerminal(terminal);

  if (terminal === 'xterm.js') {
    defineFlowSuite({ ...opts, run: baseRun, headless: false });
    defineFlowSuite({ ...opts, run: baseRun, headless: true });
    return;
  }

  // 1. Headed run (default)
  defineFlowSuite({ ...opts, run: baseRun, headless: false });

  // 2. Headless run variants (Linux only)
  if (process.platform === 'linux') {
    defineFlowSuite({
      ...opts,
      run: baseRun === 'only' ? 'only' : hasBinary('Xvfb') && hasBinary('import') ? baseRun : 'missing-binary',
      headless: true,
      displayServer: 'xvfb',
    });

    defineFlowSuite({
      ...opts,
      run: baseRun === 'only' ? 'only' : hasBinary('sway') && hasBinary('grim') ? baseRun : 'missing-binary',
      headless: true,
      displayServer: 'sway',
    });
  }
}

defineTerminalFlowSuites({
  label: 'run_flow integration (xterm.js + nvim)',
  terminal: 'xterm.js',
  yamlName: 'nvim_lazy_log.yaml',
  run: canRunTerminal('xterm.js'),
});

defineTerminalFlowSuites({
  label: 'run_flow integration (xterm.js + btop)',
  terminal: 'xterm.js',
  cols: 80,
  rows: 25,
  txtMatchers: [/(CPU|Mem|Total)/i],
  yamlName: 'btop.yaml',
  run: canRunTerminal('xterm.js'),
});

defineTerminalFlowSuites({
  label: 'run_flow integration (iTerm2 + nvim)',
  terminal: 'iterm2',
  yamlName: 'nvim_lazy_log.yaml',
  run: canRunTerminal('iterm2'),
});

defineTerminalFlowSuites({
  label: 'run_flow integration (iTerm2 + btop)',
  terminal: 'iterm2',
  txtMatchers: [/(CPU|Mem|Total)/i],
  yamlName: 'btop.yaml',
  run: canRunTerminal('iterm2'),
});

defineTerminalFlowSuites({
  label: 'run_flow integration (Terminal + nvim)',
  terminal: 'macos-terminal',
  yamlName: 'nvim_lazy_log.yaml',
  run: canRunTerminal('macos-terminal'),
});

defineTerminalFlowSuites({
  label: 'run_flow integration (Terminal + btop)',
  terminal: 'macos-terminal',
  txtMatchers: [/(CPU|Mem|Total)/i],
  yamlName: 'btop.yaml',
  run: canRunTerminal('macos-terminal'),
});

defineTerminalFlowSuites({
  label: 'run_flow integration (Alacritty + nvim)',
  terminal: 'alacritty',
  yamlName: 'nvim_lazy_log.yaml',
  run: canRunTerminal('alacritty'),
});

defineTerminalFlowSuites({
  label: 'run_flow integration (Alacritty + btop)',
  terminal: 'alacritty',
  txtMatchers: [/(CPU|Mem|Total)/i],
  yamlName: 'btop.yaml',
  run: canRunTerminal('alacritty'),
});

defineTerminalFlowSuites({
  label: 'run_flow integration (WezTerm + nvim)',
  terminal: 'wezterm',
  yamlName: 'nvim_lazy_log.yaml',
  run: canRunTerminal('wezterm'),
});

defineTerminalFlowSuites({
  label: 'run_flow integration (WezTerm + btop)',
  terminal: 'wezterm',
  cols: 120,
  rows: 40,
  txtMatchers: [/(CPU|Mem|Total)/i],
  yamlName: 'btop.yaml',
  run: canRunTerminal('wezterm'),
});

defineTerminalFlowSuites({
  label: 'run_flow integration (Ghostty + nvim)',
  terminal: 'ghostty',
  yamlName: 'nvim_lazy_log.yaml',
  run: canRunTerminal('ghostty'),
});

defineTerminalFlowSuites({
  label: 'run_flow integration (Ghostty + btop)',
  terminal: 'ghostty',
  txtMatchers: [/(CPU|Mem|Total)/i],
  yamlName: 'btop.yaml',
  run: canRunTerminal('ghostty'),
});

defineTerminalFlowSuites({
  label: 'run_flow integration (Kitty + nvim)',
  terminal: 'kitty',
  yamlName: 'nvim_lazy_log.yaml',
  run: canRunTerminal('kitty'),
});

defineTerminalFlowSuites({
  label: 'run_flow integration (Kitty + btop)',
  terminal: 'kitty',
  cols: 120,
  rows: 40,
  txtMatchers: [/(CPU|Mem|Total)/i],
  yamlName: 'btop.yaml',
  run: canRunTerminal('kitty'),
});

defineTerminalFlowSuites({
  label: 'run_flow integration (Konsole + nvim)',
  terminal: 'konsole',
  yamlName: 'nvim_lazy_log.yaml',
  run: canRunTerminal('konsole'),
});

defineTerminalFlowSuites({
  label: 'run_flow integration (Konsole + btop)',
  terminal: 'konsole',
  cols: 120,
  rows: 40,
  txtMatchers: [/(CPU|Mem|Total)/i],
  yamlName: 'btop.yaml',
  run: canRunTerminal('konsole'),
});

defineTerminalFlowSuites({
  label: 'run_flow integration (GNOME Terminal + nvim)',
  terminal: 'gnome-terminal',
  yamlName: 'nvim_lazy_log.yaml',
  run: canRunTerminal('gnome-terminal'),
});

defineTerminalFlowSuites({
  label: 'run_flow integration (GNOME Terminal + btop)',
  terminal: 'gnome-terminal',
  cols: 120,
  rows: 40,
  txtMatchers: [/(CPU|Mem|Total)/i],
  yamlName: 'btop.yaml',
  run: canRunTerminal('gnome-terminal'),
});

defineTerminalFlowSuites({
  label: 'run_flow integration (Windows Terminal + nvim)',
  terminal: 'windows-terminal',
  yamlName: 'nvim_lazy_log.yaml',
  run: canRunTerminal('windows-terminal'),
});

defineTerminalFlowSuites({
  label: 'run_flow integration (Windows Terminal + btop)',
  terminal: 'windows-terminal',
  cols: 120,
  rows: 40,
  txtMatchers: [/(CPU|Mem|Total)/i],
  yamlName: 'btop.yaml',
  run: canRunTerminal('windows-terminal'),
});

defineTerminalFlowSuites({
  label: 'run_flow integration (PowerShell + nvim)',
  terminal: 'powershell',
  yamlName: 'nvim_lazy_log.yaml',
  run: canRunTerminal('powershell'),
});

defineTerminalFlowSuites({
  label: 'run_flow integration (PowerShell + btop)',
  terminal: 'powershell',
  cols: 120,
  rows: 40,
  txtMatchers: [/(CPU|Mem|Total)/i],
  yamlName: 'btop.yaml',
  run: canRunTerminal('powershell'),
});
