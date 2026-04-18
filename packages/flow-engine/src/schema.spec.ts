import fs from 'node:fs/promises';
import { describe, it, expect, vi } from 'vitest';
import { FlowSchema, parseFlow, parseFlowFromString } from './schema.js';

vi.mock('node:fs/promises', () => {
  return {
    default: {
      readFile: vi.fn(),
    },
  };
});

describe('FlowSchema', () => {
  it('should validate a valid flow', () => {
    const data = {
      version: '1.0',
      steps: [
        { action: 'spawn', cmd: 'htop' },
        { action: 'wait_for', pattern: 'MEM' },
        { action: 'type', text: 'q' },
      ],
    };
    const flow = FlowSchema.parse(data);
    expect(flow.steps.length).toBe(3);
    expect(flow.steps[0].action).toBe('spawn');
  });

  it('should parse flow from yaml file', async () => {
    const yamlStr = `
version: "1.0"
steps:
  - action: "spawn"
    cmd: "echo 'hello'"
`;
    vi.mocked(fs.readFile).mockResolvedValue(yamlStr);
    const flow = await parseFlow('dummy.yaml');
    expect(flow.steps.length).toBe(1);
    expect(flow.steps[0]).toEqual({ action: 'spawn', cmd: "echo 'hello'" });
  });

  it('should parse flow from yaml string', () => {
    const yamlStr = `
version: "1.0"
steps:
  - action: "spawn"
    cmd: "btop"
  - action: snapshot
    format: png
    outputPath: snapshots/test_{hash}.png
    intent: "verify panel borders"
`;
    const flow = parseFlowFromString(yamlStr);
    expect(flow.steps.length).toBe(2);
    expect(flow.steps[0]).toEqual({ action: 'spawn', cmd: 'btop' });
    expect(flow.steps[1]).toMatchObject({ action: 'snapshot', format: 'png', intent: 'verify panel borders' });
  });

  it('should reject json as snapshot format', () => {
    const data = {
      steps: [{ action: 'snapshot', format: 'json', outputPath: 'out.json' }],
    };
    expect(() => FlowSchema.parse(data)).toThrow();
  });
});
