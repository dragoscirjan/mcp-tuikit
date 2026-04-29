import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function getWindowId(pid: number): Promise<string | null> {
  const scriptPath = path.resolve(__dirname, '../../../scripts/get-macos-app-wid.swift');

  try {
    const { stdout } = await execFileAsync('swift', [scriptPath, pid.toString()]);
    if (!stdout.trim()) {
      return null;
    }

    const parsed = JSON.parse(stdout);
    if (parsed.window_id !== undefined && parsed.window_id !== null) {
      return parsed.window_id.toString();
    }
  } catch {
    // Silently ignore execution or parse errors
  }

  return null;
}

export async function waitForWindowId(pid: number, timeoutMs = 5000, intervalMs = 250): Promise<string | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const windowId = await getWindowId(pid);
    if (windowId) {
      return windowId;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}
