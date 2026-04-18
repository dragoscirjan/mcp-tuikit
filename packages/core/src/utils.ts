export interface TerminalResolution {
  resolution: string;
  width: number;
  height: number;
  cols: number;
  rows: number;
}

/**
 * Parses a comma-separated list of pixel resolutions and calculates terminal dimensions.
 * Uses a heuristic of 10x20 pixels per character.
 * Example input: "640x480,1024x768"
 */
export function parseResolutions(resolutionStr: string): TerminalResolution[] {
  if (!resolutionStr || !resolutionStr.trim()) {
    return [];
  }

  const parts = resolutionStr.split(',').map((p) => p.trim());
  const results: TerminalResolution[] = [];

  for (const part of parts) {
    if (!part) continue;

    const match = /^(\d+)x(\d+)$/i.exec(part);
    if (!match) {
      throw new Error(`Invalid resolution format: '${part}'. Expected WxH (e.g. 1024x768)`);
    }

    const width = parseInt(match[1]!, 10);
    const height = parseInt(match[2]!, 10);

    if (width <= 0 || height <= 0) {
      throw new Error(`Invalid resolution dimensions: '${part}'. Width and height must be positive.`);
    }

    results.push({
      resolution: part,
      width,
      height,
      cols: Math.max(1, Math.floor(width / 10)),
      rows: Math.max(1, Math.floor(height / 20)),
    });
  }

  return results;
}
