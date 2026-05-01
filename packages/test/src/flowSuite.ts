/**
 * Shared helpers for integration test suites.
 *
 * - `runFlow`: parse a YAML flow, pass dims to FlowRunner constructor, run it.
 * - `defineFlowSuite`: declare a describe block whose artifacts are pre-run externally.
 */
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { FlowRunner, Artifact, parseFlow } from '@dragoscirjan/mcp-tuikit-flow-engine';
import { BackendFactory } from '@dragoscirjan/mcp-tuikit-terminals';
import { Terminal } from '@dragoscirjan/mcp-tuikit-terminals';
import sharp from 'sharp';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

export interface RunFlowOptions {
  /** Terminal backend to use (sets TUIKIT_TERMINAL env var). */
  terminal: Terminal;
  /** Number of columns for the spawned terminal. Defaults to 120. */
  cols?: number;
  /** Number of rows for the spawned terminal. Defaults to 40. */
  rows?: number;
  /** Run headlessly? */
  headless?: boolean;
  /** If headless, which display server to use? */
  displayServer?: 'xvfb' | 'sway' | 'kwin';
}

/**
 * Run a YAML flow file against the specified terminal backend.
 * Returns the list of Artifact objects produced by FlowRunner.
 * Dimensions are passed to the FlowRunner constructor — not injected into steps.
 */
export async function runFlow(yamlPath: string, opts: RunFlowOptions): Promise<Artifact[]> {
  const { terminal, cols = 120, rows = 40 } = opts;

  process.env.TUIKIT_TERMINAL = terminal;

  const backend = BackendFactory.create(terminal);
  const flow = await parseFlow(yamlPath);

  const runner = new FlowRunner(backend, cols, rows);
  try {
    return await runner.run(flow);
  } finally {
    await runner.cleanup();
    // Allow the OS and window compositor to fully release the terminal process
    // before the next flow is spawned — prevents window-handle collisions.
    await new Promise((r) => setTimeout(r, 2000));
  }
}

export interface FlowSuiteOptions extends RunFlowOptions {
  /** Human-readable label used in the describe block title. */
  label: string;
  /** Extra assertions about the txt snapshot content. */
  txtMatchers?: RegExp[];
  /** Name of the yaml file in the flows directory. */
  yamlName: string;
  /** How to handle this specific test */
  run?: '' | 'skip' | 'only' | 'missing-binary' | 'wrong-os';
}

/**
 * Declare a describe block that runs a flow and validates its artifacts.
 * The flow is run in a beforeAll block before the tests.
 */
export function defineFlowSuite(opts: FlowSuiteOptions): void {
  const { label, txtMatchers = [], yamlName, run = '', terminal, headless, displayServer } = opts;

  let finalLabel = label;
  if (headless) {
    if (terminal === 'xterm.js') {
      finalLabel += ' (headless via Playwright)';
    } else {
      finalLabel += ` (headless via ${displayServer || 'default'})`;
    }
  } else {
    finalLabel += ' (headed)';
  }

  let artifacts: Artifact[] = [];
  const originalEnv = { ...process.env };
  let hasCommandSpy: ReturnType<typeof vi.spyOn> | undefined;
  let tempDir: string | undefined;

  // Handled skips
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let d: any = describe;
  if (run === 'skip') {
    d = describe.skip;
  } else if (run === 'only') {
    d = describe.only;
  } else if (run === 'missing-binary') {
    d = describe.skip;
    finalLabel += ' [UNAVAILABLE: binary missing]';
  } else if (run === 'wrong-os') {
    d = describe.skip;
    finalLabel += ' [SKIPPED: wrong OS]';
  }

  d(finalLabel, () => {
    beforeAll(async () => {
      // jscpd:ignore-start
      if (headless) {
        process.env.TUIKIT_HEADLESS = '1';

        // Isolate XDG_RUNTIME_DIR to prevent terminals like Ghostty from connecting
        // to the user's running daemon on Wayland/DBus.
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `mcp-tuikit-test-${terminal}-`));
        process.env.XDG_RUNTIME_DIR = tempDir || '';
      } else {
        process.env.TUIKIT_HEADLESS = '0';
      }

      if (headless && displayServer) {
        const { VirtualSessionManager } = await import('@dragoscirjan/mcp-tuikit-spawn');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hasCommandSpy = vi.spyOn(VirtualSessionManager as any, 'hasCommand').mockImplementation((async (
          cmd: string,
        ) => {
          if (displayServer === 'xvfb' && cmd === 'Xvfb') return true;
          if (displayServer === 'sway' && cmd === 'sway') return true;
          if (displayServer === 'kwin' && cmd === 'kwin_wayland') return true;
          return false;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any);
      }
      // jscpd:ignore-end

      // Mock VirtualSessionManager if we want a specific display server
      if (headless && displayServer) {
        const { execSync } = await import('node:child_process');
        const realWhich = execSync('which which').toString().trim();

        const fakeWhichPath = path.join(tempDir || '', 'which');
        const mockXvfb = displayServer === 'xvfb' ? '1' : '0';
        const mockSway = displayServer === 'sway' ? '1' : '0';
        const mockKwin = displayServer === 'kwin' ? '1' : '0';

        const fakeWhichScript = `#!/bin/sh
if [ "$1" = "Xvfb" ] && [ "${mockXvfb}" = "0" ]; then exit 1; fi
if [ "$1" = "sway" ] && [ "${mockSway}" = "0" ]; then exit 1; fi
if [ "$1" = "kwin_wayland" ] && [ "${mockKwin}" = "0" ]; then exit 1; fi
exec ${realWhich} "$@"
`;
        await fsPromises.writeFile(fakeWhichPath, fakeWhichScript, { mode: 0o755 });
        process.env.PATH = `${tempDir || ''}:${process.env.PATH}`;

        // jscpd:ignore-start
        const { VirtualSessionManager } = await import('@dragoscirjan/mcp-tuikit-spawn');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hasCommandSpy = vi.spyOn(VirtualSessionManager as any, 'hasCommand').mockImplementation((async (
          cmd: string,
        ) => {
          if (displayServer === 'xvfb' && cmd === 'Xvfb') return true;
          if (displayServer === 'sway' && cmd === 'sway') return true;
          if (displayServer === 'kwin' && cmd === 'kwin_wayland') return true;
          return false;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any);
        // jscpd:ignore-end
      }

      artifacts = await runFlow(flowPath(yamlName), {
        terminal: opts.terminal,
        cols: opts.cols,
        rows: opts.rows,
        headless: opts.headless,
        displayServer: opts.displayServer,
      });
    }, 120_000);

    afterAll(async () => {
      process.env = originalEnv;
      if (hasCommandSpy) {
        hasCommandSpy.mockRestore();
      }
      if (tempDir) {
        await fsPromises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
    });

    it('returns two artifacts (txt + png)', () => {
      expect(artifacts).toHaveLength(2);
      expect(artifacts.some((a) => a.format === 'txt')).toBe(true);
      expect(artifacts.some((a) => a.format === 'png')).toBe(true);
    });

    it('artifact paths are inside snapshots/ and contain a nanoid hash', () => {
      for (const a of artifacts) {
        expect(a.path).toContain('snapshots/');
        // nanoid(8) produces 8 URL-safe characters [A-Za-z0-9_-]
        expect(a.path).toMatch(/[A-Za-z0-9_-]{8}\.(txt|png)$/);
      }
    });

    it('txt snapshot is non-empty', async () => {
      const artifact = artifacts.find((a) => a.format === 'txt')!;
      const txt = await fsPromises.readFile(artifact.path, 'utf8');
      expect(txt.trim().length).toBeGreaterThan(0);
    });

    for (const pattern of txtMatchers) {
      it(`txt snapshot matches ${String(pattern)}`, async () => {
        const artifact = artifacts.find((a) => a.format === 'txt')!;
        const txt = await fsPromises.readFile(artifact.path, 'utf8');
        expect(txt).toMatch(pattern);
      });
    }

    it('png snapshot is a valid image (>1 KB) and has PNG magic bytes and is not entirely black', async () => {
      const artifact = artifacts.find((a) => a.format === 'png')!;
      const stat = await fsPromises.stat(artifact.path);
      expect(stat.size).toBeGreaterThan(1000);

      // Check PNG magic bytes: 89 50 4e 47 0d 0a 1a 0a
      const fd = await fsPromises.open(artifact.path, 'r');
      try {
        const buffer = Buffer.alloc(8);
        await fd.read(buffer, 0, 8, 0);
        const hex = buffer.toString('hex');
        expect(hex).toBe('89504e470d0a1a0a');
      } finally {
        await fd.close();
      }

      // Check that it's not 100% black
      const stats = await sharp(artifact.path).stats();
      const isAllBlack = stats.channels.slice(0, 3).every((ch) => ch.max === 0);
      expect(isAllBlack).toBe(false);
    });
  });
}

/**
 * Convenience: absolute path to a flow YAML inside the project's flows/ directory.
 */
export function flowPath(name: string): string {
  return path.resolve(import.meta.dirname, '../../../flows', name);
}
