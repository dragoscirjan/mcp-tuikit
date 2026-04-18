import { SnapshotStrategy, isX11DisplayServer } from '@mcp-tuikit/core';
import { execa } from 'execa';

export class LinuxSnapshotStrategy implements SnapshotStrategy {
  async capture(
    outputPath: string,
    _cols: number,
    _rows: number,
    _tmuxSession: string,
    spawnResult?: unknown,
  ): Promise<void> {
    const windowId = (spawnResult as { windowId?: string })?.windowId;
    const isX11 = await isX11DisplayServer();

    if (isX11) {
      await this.captureX11(outputPath, windowId);
    } else {
      await this.captureWayland(outputPath);
    }
  }

  private async captureX11(outputPath: string, windowId?: string): Promise<void> {
    if (windowId) {
      try {
        await execa('import', ['-window', windowId, outputPath]);
        return;
      } catch {
        // Continue to next fallback
      }
      try {
        await execa('scrot', ['-u', '-d', '0', '-z', outputPath]);
        return;
      } catch {
        // Continue to next fallback
      }

      try {
        await execa('maim', ['-i', windowId, outputPath]);
        return;
      } catch {
        // Continue to next fallback
      }
    }

    throw new Error('Linux X11 snapshotting failed or no windowId provided');
  }

  private async captureWayland(outputPath: string): Promise<void> {
    try {
      await execa('grim', [outputPath]);
      return;
    } catch (e) {
      throw new Error(`Linux Wayland snapshotting failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
