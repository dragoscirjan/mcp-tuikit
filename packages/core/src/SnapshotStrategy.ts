export interface SnapshotStrategy {
  capture(outputPath: string, cols: number, rows: number, tmuxSession: string): Promise<void>;
}
