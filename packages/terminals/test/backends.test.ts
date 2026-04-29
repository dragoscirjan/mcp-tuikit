import { defineBackendSuite } from './helpers/backendSuite';
import { canRunTerminal } from '../../spawn/test/helpers/canRunTerminal';
import { hasBinary } from '../../spawn/test/helpers/hasBinary';

// Helper to define all display variants for a given terminal
function defineTerminalSuites(terminal: Parameters<typeof canRunTerminal>[0], label: string) {
  const baseRun = canRunTerminal(terminal);

  if (terminal === 'xterm.js') {
    // xterm.js runs in Playwright: we can do headed and headless without Linux graphic servers
    defineBackendSuite({
      label,
      terminal,
      run: baseRun,
      headless: false,
    });
    defineBackendSuite({
      label,
      terminal,
      run: baseRun,
      headless: true,
    });
    return;
  }

  // All other native terminals:
  // 1. Headed run (default)
  defineBackendSuite({
    label,
    terminal,
    run: baseRun,
    headless: false,
  });

  // 2. Headless run variants (Linux only)
  if (process.platform === 'linux') {
    // Xvfb
    defineBackendSuite({
      label,
      terminal,
      run: baseRun === 'only' ? 'only' : hasBinary('Xvfb') && hasBinary('import') ? baseRun : 'missing-binary',
      headless: true,
      displayServer: 'xvfb',
    });

    // Sway
    defineBackendSuite({
      label,
      terminal,
      run: baseRun === 'only' ? 'only' : hasBinary('sway') && hasBinary('grim') ? baseRun : 'missing-binary',
      headless: true,
      displayServer: 'sway',
    });
  }
}

defineTerminalSuites('xterm.js', 'run_flow integration (xterm.js)');
defineTerminalSuites('macos-terminal', 'run_flow integration (Terminal )');
defineTerminalSuites('iterm2', 'run_flow integration (iTerm2)');
defineTerminalSuites('alacritty', 'run_flow integration (Alacritty)');
defineTerminalSuites('wezterm', 'run_flow integration (WezTerm)');
defineTerminalSuites('ghostty', 'run_flow integration (Ghostty)');
defineTerminalSuites('konsole', 'run_flow integration (Konsole)');
defineTerminalSuites('kitty', 'run_flow integration (Kitty)');
defineTerminalSuites('gnome-terminal', 'run_flow integration (GNOME Terminal)');
defineTerminalSuites('windows-terminal', 'run_flow integration (Windows Terminal)');
defineTerminalSuites('powershell', 'run_flow integration (PowerShell)');

// defineTerminalSuites('pwsh', 'run_flow integration (pwsh)');
// defineTerminalSuites('cmd', 'run_flow integration (CMD)');
