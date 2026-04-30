import { SpawnOptions } from '@dragoscirjan/mcp-tuikit-spawn';
import { ShellSpawnedBackend } from '../base/ShellSpawnedBackend.js';

export class WindowsTerminalBackend extends ShellSpawnedBackend {
  protected async getSpawnOptions(tmuxAbsPath: string, sessionName: string): Promise<SpawnOptions> {
    // We launch Windows Terminal with a new tab, optionally specifying size, and running tmux attach.
    // The columns and rows can be passed to wt via `--size <cols>,<rows>`.
    // However, wt's syntax for the command to run after is just appending it.
    // wt.exe -w -1 new-tab --title "tuikit-session" --size 80,24 tmux attach -t mcp-xxxxx

    // We must pass the correct arguments. wt.exe takes the command at the end.
    // Note: tmux needs to be accessible in the environment.
    return {
      appName: 'Windows Terminal',
      executable: 'wt.exe',
      args: [
        '-w',
        '-1', // new window or use current? -1 means new window always
        '--size',
        `${this.cols},${this.rows}`,
        'new-tab',
        '--title',
        `tuikit-${sessionName}`,
        tmuxAbsPath,
        'attach',
        '-t',
        sessionName,
      ],
      requireWindowId: true,
    };
  }
}
