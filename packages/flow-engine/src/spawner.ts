import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export async function spawnTerminal(backend: string, tmuxSessionName: string): Promise<void> {
  let command: string;

  switch (backend.toLowerCase()) {
    case 'wezterm':
      command = `wezterm cli spawn -- tmux attach -t ${tmuxSessionName}`;
      break;
    case 'alacritty':
      command = `alacritty -e tmux attach -t ${tmuxSessionName}`;
      break;
    case 'ghostty':
      command = `ghostty -e "tmux attach -t ${tmuxSessionName}"`;
      break;
    case 'iterm2':
      command = `osascript -e 'tell application "iTerm" to create window with default profile command "tmux attach -t ${tmuxSessionName}"'`;
      break;
    default:
      throw new Error(`Unknown terminal backend: ${backend}`);
  }

  await execAsync(command);
}
