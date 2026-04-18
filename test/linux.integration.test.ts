import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { LinuxNativeSpawner } from '../packages/core/src/spawn/linux/LinuxNativeSpawner.js';
import type { NativeSpawnResult } from '../packages/core/src/spawn/Spawner.js';
import { getDisplayServerProtocol } from '../packages/native-linux/index.js';
import { LinuxSnapshotStrategy } from '../packages/terminals/src/snapshotters/linux.js';

describe('Linux Spawner & Snapshotter Integration', () => {
  let spawner: LinuxNativeSpawner;
  let snapshotter: LinuxSnapshotStrategy;
  let spawnResult: NativeSpawnResult | undefined;
  const outPath = path.join(process.cwd(), 'test-artifact.png');

  beforeAll(() => {
    spawner = new LinuxNativeSpawner();
    snapshotter = new LinuxSnapshotStrategy();
  });

  afterAll(async () => {
    if (spawnResult?.pid) {
      console.log(`Cleaning up spawned process ${spawnResult.pid}...`);
      await spawner.kill(spawnResult.pid);
    }
    if (fs.existsSync(outPath)) {
      // fs.unlinkSync(outPath); // keep for artifact review or remove?
    }
  });

  it('detects the display server via rust native module', () => {
    const protocol = getDisplayServerProtocol();
    console.log(`Detected display server: ${protocol}`);
    expect(['x11', 'wayland', 'unknown']).toContain(protocol);
  });

  it('spawns a terminal and takes a screenshot', async () => {
    const protocol = getDisplayServerProtocol();
    if (protocol === 'unknown') {
      console.warn('No active display server found. Skipping integration test.');
      return; // Skip test
    }

    // Check if the required screenshot tool exists
    const tool = protocol === 'wayland' ? 'grim' : 'scrot';
    try {
      execSync(`which ${tool}`, { stdio: 'ignore' });
    } catch {
      console.warn(`Required screenshot tool '${tool}' is missing. Skipping snapshot capture test.`);
      return; // Skip test gracefully if tool is missing
    }

    try {
      console.log('Spawning xterm...');
      spawnResult = await spawner.spawn({
        executable: 'xterm',
        args: ['-e', 'sleep 10'], // keeps terminal open for 10 seconds
        appName: 'xterm',
        requireWindowId: true,
      });

      console.log('Spawned successfully:', spawnResult);

      expect(spawnResult.pid).toBeDefined();
      expect(spawnResult.pid).toBeGreaterThan(0);

      const isX11 = protocol === 'x11';
      expect(isX11 ? spawnResult.windowId : (spawnResult as Record<string, unknown>).fallbackIdentifier).toBeDefined();

      // Give the terminal a moment to render
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log(`Taking screenshot with ${tool}...`);
      await snapshotter.capture(
        outPath,
        80, // cols
        24, // rows
        'test-tmux', // tmuxSession
        spawnResult, // spawnResult (contains windowId for X11)
      );

      expect(fs.existsSync(outPath)).toBe(true);

      const screenshotBuffer = fs.readFileSync(outPath);
      console.log(`Screenshot taken! Buffer length: ${screenshotBuffer.length} bytes`);

      expect(Buffer.isBuffer(screenshotBuffer)).toBe(true);
      expect(screenshotBuffer.length).toBeGreaterThan(0);

      // Verify it's a PNG (Magic Number: 89 50 4E 47 0D 0A 1A 0A)
      expect(screenshotBuffer[0]).toBe(0x89);
      expect(screenshotBuffer[1]).toBe(0x50);
      expect(screenshotBuffer[2]).toBe(0x4e);
      expect(screenshotBuffer[3]).toBe(0x47);
    } catch (e) {
      console.error('Integration test failed:', e);
      throw e;
    }
  }, 15000); // 15 second timeout to allow spawn + render + screenshot
});
