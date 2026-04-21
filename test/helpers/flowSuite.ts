/**
 * Shared helpers for integration test suites.
 *
 * - `runFlow`: parse a YAML flow, pass dims to FlowRunner constructor, run it.
 * - `defineFlowSuite`: declare a describe block whose artifacts are pre-run externally.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { FlowRunner, Artifact, parseFlow } from '@mcp-tuikit/flow-engine';
import { BackendFactory } from '@mcp-tuikit/terminals';
import { Terminal } from '@mcp-tuikit/terminals/src';
import { describe, it, expect, beforeAll } from 'vitest';

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
  const { label, txtMatchers = [], yamlName, run = '' } = opts;

  let d = describe;
  let finalLabel = label;

  /* jscpd:ignore-start */
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
  /* jscpd:ignore-end */

  d(finalLabel, () => {
    let artifacts: Artifact[] = [];

    beforeAll(async () => {
      artifacts = await runFlow(flowPath(yamlName), {
        terminal: opts.terminal,
        cols: opts.cols,
        rows: opts.rows,
      });
    }, 120_000);

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
      const txt = await fs.readFile(artifact.path, 'utf8');
      expect(txt.trim().length).toBeGreaterThan(0);
    });

    for (const pattern of txtMatchers) {
      it(`txt snapshot matches ${String(pattern)}`, async () => {
        const artifact = artifacts.find((a) => a.format === 'txt')!;
        const txt = await fs.readFile(artifact.path, 'utf8');
        expect(txt).toMatch(pattern);
      });
    }

    it('png snapshot is a valid image (>1 KB) and has PNG magic bytes', async () => {
      const artifact = artifacts.find((a) => a.format === 'png')!;
      const stat = await fs.stat(artifact.path);
      expect(stat.size).toBeGreaterThan(1000);

      // Check PNG magic bytes: 89 50 4e 47 0d 0a 1a 0a
      const fd = await fs.open(artifact.path, 'r');
      try {
        const buffer = Buffer.alloc(8);
        await fd.read(buffer, 0, 8, 0);
        const hex = buffer.toString('hex');
        expect(hex).toBe('89504e470d0a1a0a');
      } finally {
        await fd.close();
      }
    });
  });
}

/**
 * Convenience: absolute path to a flow YAML inside the project's flows/ directory.
 */
export function flowPath(name: string): string {
  return path.resolve(import.meta.dirname, '../../flows', name);
}
