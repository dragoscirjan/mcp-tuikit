/**
 * Shared helpers for integration test suites.
 *
 * - `runFlow`: parse a YAML flow, pass dims to FlowRunner constructor, run it.
 * - `defineFlowSuite`: declare a describe block whose artifacts are pre-run externally.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { FlowRunner, Artifact, parseFlow } from '@mcp-tuikit/flow-engine';
import { TmuxBackend } from '@mcp-tuikit/tmux';
import { describe, it, expect } from 'vitest';

export type Terminal = 'iterm2' | 'alacritty' | 'wezterm' | 'ghostty' | 'xterm.js';

export interface RunFlowOptions {
  /** Terminal backend to use (sets TUIKIT_TERMINAL env var). */
  terminal: Terminal;
  /** Number of columns for the spawned terminal. Defaults to 120. */
  cols?: number;
  /** Number of rows for the spawned terminal. Defaults to 40. */
  rows?: number;
}

/**
 * Run a YAML flow file against the specified terminal backend.
 * Returns the list of Artifact objects produced by FlowRunner.
 * Dimensions are passed to the FlowRunner constructor — not injected into steps.
 */
export async function runFlow(yamlPath: string, opts: RunFlowOptions): Promise<Artifact[]> {
  const { terminal, cols = 120, rows = 40 } = opts;

  process.env.TUIKIT_TERMINAL = terminal;

  const backend = new TmuxBackend();
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
  /** Getter for artifacts populated by a parent beforeAll. */
  artifacts: () => Artifact[];
}

/**
 * Declare a describe block that validates artifacts returned by a pre-run flow.
 * The artifacts getter is populated externally (in a parent beforeAll) so that
 * multiple suites share a single sequential setup phase.
 */
export function defineFlowSuite(opts: FlowSuiteOptions): void {
  const { label, txtMatchers = [], artifacts: getArtifacts } = opts;

  describe(label, () => {
    it('returns two artifacts (txt + png)', () => {
      expect(getArtifacts()).toHaveLength(2);
      expect(getArtifacts().some((a) => a.format === 'txt')).toBe(true);
      expect(getArtifacts().some((a) => a.format === 'png')).toBe(true);
    });

    it('artifact paths are inside snapshots/ and contain a nanoid hash', () => {
      for (const a of getArtifacts()) {
        expect(a.path).toContain('snapshots/');
        // nanoid(8) produces 8 URL-safe characters [A-Za-z0-9_-]
        expect(a.path).toMatch(/[A-Za-z0-9_-]{8}\.(txt|png)$/);
      }
    });

    it('txt snapshot is non-empty', async () => {
      const artifact = getArtifacts().find((a) => a.format === 'txt')!;
      const txt = await fs.readFile(artifact.path, 'utf8');
      expect(txt.trim().length).toBeGreaterThan(0);
    });

    for (const pattern of txtMatchers) {
      it(`txt snapshot matches ${String(pattern)}`, async () => {
        const artifact = getArtifacts().find((a) => a.format === 'txt')!;
        const txt = await fs.readFile(artifact.path, 'utf8');
        expect(txt).toMatch(pattern);
      });
    }

    it('png snapshot is a valid image (>1 KB)', async () => {
      const artifact = getArtifacts().find((a) => a.format === 'png')!;
      const stat = await fs.stat(artifact.path);
      expect(stat.size).toBeGreaterThan(1000);
    });
  });
}

/**
 * Convenience: absolute path to a flow YAML inside the project's flows/ directory.
 */
export function flowPath(name: string): string {
  return path.resolve(import.meta.dirname, '../../flows', name);
}
