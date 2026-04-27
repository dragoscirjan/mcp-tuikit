export type Terminal =
  // all OS
  | 'xterm.js'
  | 'alacritty'
  | 'wezterm'
  // MacOs
  | 'macos-terminal'
  | 'iterm2'
  // Linux and MacOs
  | 'ghostty'
  | 'kitty'
  // Linux
  | 'konsole'
  | 'gnome-terminal'
  // Windows
  | 'windows-terminal'
  | 'powershell'
  | 'pwsh';
// | 'cmd';
