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
import { Artifact } from '@mcp-tuikit/flow-engine';
import { beforeAll } from 'vitest';
import { runFlow, defineFlowSuite, flowPath } from './helpers/flowSuite.js';

const SNAPSHOTS = path.resolve(import.meta.dirname, '..', 'snapshots');

// ── Artifact buckets populated by sequential beforeAll ────────────────────────
let iTerm2NvimArtifacts: Artifact[] = [];
let iTerm2BtopArtifacts: Artifact[] = [];
let alacrittyNvimArtifacts: Artifact[] = [];
let alacrittyBtopArtifacts: Artifact[] = [];
let weztermNvimArtifacts: Artifact[] = [];
let weztermBtopArtifacts: Artifact[] = [];
let ghosttyNvimArtifacts: Artifact[] = [];
let ghosttyBtopArtifacts: Artifact[] = [];
let xtermjsNvimArtifacts: Artifact[] = [];
let xtermjsBtopArtifacts: Artifact[] = [];

// Total wall-clock budget:
//   5 terminals × (nvim ~40s + btop ~20s) + per-terminal startup + margin
//   = ~300s core + ~200s native terminal overhead → use 900s to be safe
beforeAll(async () => {
  await fs.rm(SNAPSHOTS, { recursive: true, force: true });

  // 1. xterm.js + nvim  (Playwright/xterm.js renderer — no native terminal required)
  xtermjsNvimArtifacts = await runFlow(flowPath('nvim_lazy_log.yaml'), { terminal: 'xterm.js' });
  // 2. xterm.js + btop
  xtermjsBtopArtifacts = await runFlow(flowPath('btop.yaml'), { terminal: 'xterm.js' });

  // 3. iTerm2 + nvim
  iTerm2NvimArtifacts = await runFlow(flowPath('nvim_lazy_log.yaml'), { terminal: 'iterm2' });
  // 4. iTerm2 + btop
  iTerm2BtopArtifacts = await runFlow(flowPath('btop.yaml'), { terminal: 'iterm2' });

  // 5. Alacritty + nvim
  alacrittyNvimArtifacts = await runFlow(flowPath('nvim_lazy_log.yaml'), { terminal: 'alacritty' });
  // 6. Alacritty + btop
  alacrittyBtopArtifacts = await runFlow(flowPath('btop.yaml'), { terminal: 'alacritty' });

  // 7. WezTerm + nvim
  weztermNvimArtifacts = await runFlow(flowPath('nvim_lazy_log.yaml'), { terminal: 'wezterm' });
  // 8. WezTerm + btop
  weztermBtopArtifacts = await runFlow(flowPath('btop.yaml'), { terminal: 'wezterm' });

  // 9. Ghostty + nvim
  ghosttyNvimArtifacts = await runFlow(flowPath('nvim_lazy_log.yaml'), { terminal: 'ghostty' });
  // 10. Ghostty + btop
  ghosttyBtopArtifacts = await runFlow(flowPath('btop.yaml'), { terminal: 'ghostty' });
}, 900_000);

// ── Suites ────────────────────────────────────────────────────────────────────

defineFlowSuite({
  label: 'run_flow integration (xterm.js + nvim)',
  terminal: 'xterm.js',
  artifacts: () => xtermjsNvimArtifacts,
});

defineFlowSuite({
  label: 'run_flow integration (xterm.js + btop)',
  terminal: 'xterm.js',
  txtMatchers: [/CPU/],
  artifacts: () => xtermjsBtopArtifacts,
});

defineFlowSuite({
  label: 'run_flow integration (iTerm2 + nvim)',
  terminal: 'iterm2',
  artifacts: () => iTerm2NvimArtifacts,
});

defineFlowSuite({
  label: 'run_flow integration (iTerm2 + btop)',
  terminal: 'iterm2',
  txtMatchers: [/CPU/],
  artifacts: () => iTerm2BtopArtifacts,
});

defineFlowSuite({
  label: 'run_flow integration (Alacritty + nvim)',
  terminal: 'alacritty',
  artifacts: () => alacrittyNvimArtifacts,
});

defineFlowSuite({
  label: 'run_flow integration (Alacritty + btop)',
  terminal: 'alacritty',
  txtMatchers: [/CPU/],
  artifacts: () => alacrittyBtopArtifacts,
});

defineFlowSuite({
  label: 'run_flow integration (WezTerm + nvim)',
  terminal: 'wezterm',
  artifacts: () => weztermNvimArtifacts,
});

defineFlowSuite({
  label: 'run_flow integration (WezTerm + btop)',
  terminal: 'wezterm',
  txtMatchers: [/CPU/],
  artifacts: () => weztermBtopArtifacts,
});

defineFlowSuite({
  label: 'run_flow integration (Ghostty + nvim)',
  terminal: 'ghostty',
  artifacts: () => ghosttyNvimArtifacts,
});

defineFlowSuite({
  label: 'run_flow integration (Ghostty + btop)',
  terminal: 'ghostty',
  txtMatchers: [/CPU/],
  artifacts: () => ghosttyBtopArtifacts,
});
