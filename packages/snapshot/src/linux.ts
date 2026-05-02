import * as fs from 'node:fs';
import dbus from 'dbus-next';
import { execa } from 'execa';
import { SnapshotStrategy } from './SnapshotStrategy.js';

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
  async capture(
    outputPath: string,
    _cols: number,
    _rows: number,
    _tmuxSession: string,
    spawnResult?: unknown,
  ): Promise<void> {
    const { isX11DisplayServer } = await import('@dragoscirjan/mcp-tuikit-linux-utils');
    const isX11 = await isX11DisplayServer();
    const windowId = (spawnResult as { windowId?: string })?.windowId;
    const virtualSession = (spawnResult as { virtualSession?: { type: string; display: string } })?.virtualSession;
    const de = getDesktopEnvironment();

    try {
      if (virtualSession) {
        // Headless Mode: Capture from the isolated virtual session
        if (virtualSession.type === 'xvfb') {
          // Xvfb runs pure X11, so we use import on the root window
          await execa('import', ['-window', 'root', outputPath], {
            env: { ...process.env, DISPLAY: virtualSession.display },
          });
          return;
        } else if (virtualSession.type === 'sway') {
          // sway runs pure Wayland, so we use grim
          await execa('grim', [outputPath], {
            env: { ...process.env, WAYLAND_DISPLAY: virtualSession.display },
          });
          await waitForFile(outputPath);
          return;
        }
        throw new Error(`Unsupported virtual session type: ${virtualSession.type}`);
      }

      // Headed Mode: Use host desktop logic
      await this.captureActiveWindow(outputPath, de, isX11, windowId);
    } catch (error) {
      throw new Error(
        `Linux native snapshot failed for DE=${de} (X11=${isX11}, virtualSession=${virtualSession?.type || 'none'}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async captureActiveWindow(outputPath: string, de: string, isX11: boolean, windowId?: string): Promise<void> {
    const path = await import('node:path');
    const absoluteOutputPath = path.resolve(process.cwd(), outputPath);

    // 1. KDE Plasma (Wayland and X11)
    if (de === 'KDE') {
      try {
        await execa('spectacle', ['-a', '-b', '-n', '-o', absoluteOutputPath]);
        await waitForFile(absoluteOutputPath);
        return;
      } catch (e) {
        throw new Error('spectacle capture failed: ' + String(e));
      }
    }

    // 2. GNOME (Wayland and X11)
    if (de === 'GNOME') {
      try {
        await execa('gnome-screenshot', ['-w', '-f', absoluteOutputPath]);
        await waitForFile(absoluteOutputPath);
        return;
      } catch {
        let bus: dbus.MessageBus | null = null;
        try {
          bus = dbus.sessionBus();
          const obj = await bus.getProxyObject('org.gnome.Shell.Screenshot', '/org/gnome/Shell/Screenshot');
          const iface = obj.getInterface('org.gnome.Shell.Screenshot');
          await iface.Screenshot(false, false, absoluteOutputPath);
          return;
        } finally {
          if (bus) bus.disconnect();
        }
      }
    }

    // 3. MATE (X11)
    if (de === 'MATE') {
      try {
        await execa('mate-screenshot', ['-w', '-f', absoluteOutputPath]);
        await waitForFile(absoluteOutputPath);
        return;
      } catch (e) {
        throw new Error('mate-screenshot capture failed: ' + String(e));
      }
    }

    // 4. XFCE (X11)
    if (de === 'XFCE') {
      try {
        await execa('xfce4-screenshooter', ['-w', '-s', absoluteOutputPath]);
        await waitForFile(absoluteOutputPath);
        return;
      } catch (e) {
        throw new Error('xfce4-screenshooter capture failed: ' + String(e));
      }
    }

    // 5. Generic X11 Fallback
    if (isX11 && windowId) {
      try {
        await execa('import', ['-window', windowId, absoluteOutputPath]);
        return;
      } catch {
        // ignore
      }
      try {
        await execa('scrot', ['-u', '-d', '0', '-z', absoluteOutputPath]);
        return;
      } catch {
        // ignore
      }
      try {
        await execa('maim', ['-i', windowId, absoluteOutputPath]);
        return;
      } catch {
        // ignore
      }
    }

    // 6. Generic Wayland Fallback (full screen grim)
    if (!isX11) {
      try {
        await execa('grim', [absoluteOutputPath]);
        await waitForFile(absoluteOutputPath);
        return;
      } catch (e) {
        throw new Error('grim fallback failed: ' + String(e));
      }
    }

    throw new Error('No supported screenshot tool found for ' + de);
  }
}
