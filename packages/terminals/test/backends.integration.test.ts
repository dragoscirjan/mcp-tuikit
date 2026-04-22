import { defineBackendSuite } from './helpers/backendSuite';
import { canRunTerminal } from '../../core/test/helpers/canRunTerminal';

defineBackendSuite({
  label: 'run_flow integration (xterm.js)',
  terminal: 'xterm.js',
  run: canRunTerminal('xterm.js'),
});

defineBackendSuite({
  label: 'run_flow integration (Terminal )',
  terminal: 'macos-terminal',
  run: canRunTerminal('macos-terminal'),
});

defineBackendSuite({
  label: 'run_flow integration (iTerm2)',
  terminal: 'iterm2',
  run: canRunTerminal('iterm2'),
});

defineBackendSuite({
  label: 'run_flow integration (Alacritty)',
  terminal: 'alacritty',
  run: canRunTerminal('alacritty'),
});

defineBackendSuite({
  label: 'run_flow integration (WezTerm)',
  terminal: 'wezterm',
  run: canRunTerminal('wezterm'),
});

defineBackendSuite({
  label: 'run_flow integration (Ghostty)',
  terminal: 'ghostty',
  run: canRunTerminal('ghostty'),
});

defineBackendSuite({
  label: 'run_flow integration (Windows Terminal)',
  terminal: 'windows-terminal',
  run: canRunTerminal('windows-terminal'),
});

defineBackendSuite({
  label: 'run_flow integration (PowerShell)',
  terminal: 'powershell',
  run: canRunTerminal('powershell'),
});

// defineBackendSuite({
//   label: 'run_flow integration (pwsh)',
//   terminal: 'pwsh',
//   run: canRunTerminal('pwsh'),
// });
//
// defineBackendSuite({
//   label: 'run_flow integration (CMD)',
//   terminal: 'cmd',
//   run: canRunTerminal('cmd'),
// });
