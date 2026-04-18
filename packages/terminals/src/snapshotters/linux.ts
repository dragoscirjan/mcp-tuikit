import * as fs from 'node:fs';
import { SnapshotStrategy, isX11DisplayServer } from '@mcp-tuikit/core';
import dbus from 'dbus-next';
import { execa } from 'execa';
import { HeadlessSnapshotStrategy } from './headless.js';

async function waitForFile(path: string, timeoutMs: number = 3000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(path)) {
      const stats = fs.statSync(path);
      if (stats.size > 0) {
        // Wait a tiny bit more to ensure it's fully written
        await new Promise((r) => setTimeout(r, 100));
        return;
      }
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`Timeout waiting for snapshot file: ${path}`);
}

export class LinuxSnapshotStrategy implements SnapshotStrategy {
  private headlessStrategy = new HeadlessSnapshotStrategy();

  async capture(
    outputPath: string,
    cols: number,
    rows: number,
    tmuxSession: string,
    spawnResult?: unknown,
  ): Promise<void> {
    if (process.env.LINUX_SNAPSHOT_MODE !== 'native') {
      return this.headlessStrategy.capture(outputPath, cols, rows, tmuxSession, spawnResult);
    }

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
    // 1. GNOME: Pure Node.js D-Bus approach (bypasses CLI dependencies)
    let bus: dbus.MessageBus | null = null;
    try {
      bus = dbus.sessionBus();
      const obj = await bus.getProxyObject('org.gnome.Shell.Screenshot', '/org/gnome/Shell/Screenshot');
      const iface = obj.getInterface('org.gnome.Shell.Screenshot');

      // Screenshot(boolean include_cursor, boolean flash, string filename) -> (boolean success, string filename_used)
      await iface.Screenshot(false, false, outputPath);
      return;
    } catch {
      // Not GNOME, or DBus failed
      // Fallback to KDE
    } finally {
      if (bus) {
        bus.disconnect();
      }
    }

    // 2. KDE: Spectacle CLI (Native KDE screenshot tool, bypasses KWin auth restrictions)
    try {
      await execa('spectacle', ['-b', '-n', '-o', outputPath]);
      await waitForFile(outputPath);
      return;
    } catch {
      // Continue to next fallback
    }

    // 3. Wlroots (Sway, Hyprland): grim CLI
    try {
      await execa('grim', [outputPath]);
      await waitForFile(outputPath);
      return;
    } catch {
      throw new Error(
        'Linux Wayland snapshotting failed. No supported compositor API or fallback tools (GNOME DBus/Spectacle/grim) available.',
      );
    }
  }
}
