export interface SnapshotStrategy {
  capture(outputPath: string, cols: number, rows: number, tmuxSession: string, spawnResult?: unknown): Promise<void>;
}
