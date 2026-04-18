export interface SpawnOptions {
  appName: string; // Used for window identification (e.g. "Alacritty")
  executable: string; // The binary to execute (e.g. "alacritty", "open")
  args: string[];
  env?: Record<string, string>;
  requireWindowId?: boolean; // If true, waits and queries the OS for the window ID
}

export interface SpawnResult {
  pid: number | null;
  windowId: string | null;
}

export interface AppSpawner {
  spawn(options: SpawnOptions): Promise<SpawnResult>;
  kill(pid: number): Promise<void>;
}
