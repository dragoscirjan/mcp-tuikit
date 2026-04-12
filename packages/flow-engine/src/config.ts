export function getBackendConfig(): string {
  if (process.env.CI) {
    return 'playwright';
  }

  if (process.env.TUIKIT_TERMINAL) {
    return process.env.TUIKIT_TERMINAL;
  }

  switch (process.platform) {
    case 'darwin':
      return 'iterm2';
    case 'linux':
      return 'gnome-terminal';
    case 'win32':
      return 'windows-terminal';
    default:
      return 'xterm';
  }
}
