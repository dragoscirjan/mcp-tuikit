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
import os from 'node:os';
import path from 'node:path';
import { beforeAll } from 'vitest';
import { defineFlowSuite, FlowSuiteOptions } from './helpers/flowSuite.js';

const SNAPSHOTS = path.resolve(import.meta.dirname, '..', 'snapshots');

function run(terminal: FlowSuiteOptions['terminal']): FlowSuiteOptions['run'] {
  const target = process.env.TUIKIT_TERMINAL_TEST;
  switch (terminal) {
    case 'xterm.js':
      return target === 'xterm.js' ? 'only' : '';
    case 'iterm2':
      return os.type() !== 'Darwin' ? 'skip' : target === 'iterm2' ? 'only' : '';
    default:
      return 'skip';
  }
}

beforeAll(async () => {
  await fs.rm(SNAPSHOTS, { recursive: true, force: true });
}, 900_000);

// ── Suites ────────────────────────────────────────────────────────────────────

defineFlowSuite({
  label: 'run_flow integration (xterm.js + nvim)',
  terminal: 'xterm.js',
  yamlName: 'nvim_lazy_log.yaml',
  run: run('xterm.js'),
});

defineFlowSuite({
  label: 'run_flow integration (xterm.js + btop)',
  terminal: 'xterm.js',
  txtMatchers: [/CPU/],
  yamlName: 'btop.yaml',
  run: run('xterm.js'),
});

defineFlowSuite({
  label: 'run_flow integration (iTerm2 + nvim)',
  terminal: 'iterm2',
  yamlName: 'nvim_lazy_log.yaml',
  run: run('iterm2'),
});

defineFlowSuite({
  label: 'run_flow integration (iTerm2 + btop)',
  terminal: 'iterm2',
  txtMatchers: [/CPU/],
  yamlName: 'btop.yaml',
  run: run('iterm2'),
});

defineFlowSuite({
  label: 'run_flow integration (Alacritty + nvim)',
  terminal: 'alacritty',
  yamlName: 'nvim_lazy_log.yaml',
  run: run('alacritty'),
});

defineFlowSuite({
  label: 'run_flow integration (Alacritty + btop)',
  terminal: 'alacritty',
  txtMatchers: [/CPU/],
  yamlName: 'btop.yaml',
  run: run('alacritty'),
});

defineFlowSuite({
  label: 'run_flow integration (WezTerm + nvim)',
  terminal: 'wezterm',
  yamlName: 'nvim_lazy_log.yaml',
  run: run('wezterm'),
});

defineFlowSuite({
  label: 'run_flow integration (WezTerm + btop)',
  terminal: 'wezterm',
  txtMatchers: [/Mem/],
  yamlName: 'btop.yaml',
  run: run('wezterm'),
});

defineFlowSuite({
  label: 'run_flow integration (Ghostty + nvim)',
  terminal: 'ghostty',
  yamlName: 'nvim_lazy_log.yaml',
  run: run('ghostty'),
});

defineFlowSuite({
  label: 'run_flow integration (Ghostty + btop)',
  terminal: 'ghostty',
  txtMatchers: [/CPU/],
  yamlName: 'btop.yaml',
  run: run('ghostty'),
});
