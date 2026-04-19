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

function getDesktopEnvironment(): string {
  const xdgDesktop = process.env.XDG_CURRENT_DESKTOP || '';
  if (xdgDesktop.includes('KDE')) return 'KDE';
  if (xdgDesktop.includes('GNOME')) return 'GNOME';
  if (xdgDesktop.includes('MATE')) return 'MATE';
  if (xdgDesktop.includes('XFCE')) return 'XFCE';
  if (xdgDesktop.includes('CINNAMON')) return 'CINNAMON';
  if (xdgDesktop.includes('Sway') || process.env.SWAYSOCK) return 'SWAY';
  if (xdgDesktop.includes('Hyprland') || process.env.HYPRLAND_INSTANCE_SIGNATURE) return 'HYPRLAND';

  return 'UNKNOWN';
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

    const isX11 = await isX11DisplayServer();
    const windowId = (spawnResult as { windowId?: string })?.windowId;
    const de = getDesktopEnvironment();

    try {
      await this.captureActiveWindow(outputPath, de, isX11, windowId);
    } catch (error) {
      throw new Error(
        `Linux native snapshot failed for DE=${de} (X11=${isX11}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async captureActiveWindow(outputPath: string, de: string, isX11: boolean, windowId?: string): Promise<void> {
    // 1. KDE Plasma (Wayland and X11)
    if (de === 'KDE') {
      try {
        await execa('spectacle', ['-a', '-b', '-n', '-o', outputPath]);
        await waitForFile(outputPath);
        return;
      } catch (e) {
        throw new Error('spectacle capture failed: ' + String(e));
      }
    }

    // 2. GNOME (Wayland and X11)
    if (de === 'GNOME') {
      try {
        await execa('gnome-screenshot', ['-w', '-f', outputPath]);
        await waitForFile(outputPath);
        return;
      } catch {
        let bus: dbus.MessageBus | null = null;
        try {
          bus = dbus.sessionBus();
          const obj = await bus.getProxyObject('org.gnome.Shell.Screenshot', '/org/gnome/Shell/Screenshot');
          const iface = obj.getInterface('org.gnome.Shell.Screenshot');
          await iface.Screenshot(false, false, outputPath);
          return;
        } finally {
          if (bus) bus.disconnect();
        }
      }
    }

    // 3. MATE (X11)
    if (de === 'MATE') {
      try {
        await execa('mate-screenshot', ['-w', '-f', outputPath]);
        await waitForFile(outputPath);
        return;
      } catch (e) {
        throw new Error('mate-screenshot capture failed: ' + String(e));
      }
    }

    // 4. XFCE (X11)
    if (de === 'XFCE') {
      try {
        await execa('xfce4-screenshooter', ['-w', '-s', outputPath]);
        await waitForFile(outputPath);
        return;
      } catch (e) {
        throw new Error('xfce4-screenshooter capture failed: ' + String(e));
      }
    }

    // 5. Generic X11 Fallback
    if (isX11 && windowId) {
      try {
        await execa('import', ['-window', windowId, outputPath]);
        return;
      } catch {
        // ignore
      }
      try {
        await execa('scrot', ['-u', '-d', '0', '-z', outputPath]);
        return;
      } catch {
        // ignore
      }
      try {
        await execa('maim', ['-i', windowId, outputPath]);
        return;
      } catch {
        // ignore
      }
    }

    // 6. Generic Wayland Fallback (full screen grim)
    if (!isX11) {
      try {
        await execa('grim', [outputPath]);
        await waitForFile(outputPath);
        return;
      } catch (e) {
        throw new Error('grim fallback failed: ' + String(e));
      }
    }

    throw new Error('No supported screenshot tool found for ' + de);
  }
}
