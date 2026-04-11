import fs from 'node:fs/promises';
import { describe, it, expect, vi } from 'vitest';
import { FlowSchema, parseFlow } from './schema.js';

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
    expect(flow.steps[0]).toEqual({ action: 'spawn', cmd: "echo 'hello'", cols: 80, rows: 24 });
  });
});
