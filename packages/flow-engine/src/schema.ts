import fs from 'node:fs/promises';
import yaml from 'js-yaml';
import { z } from 'zod';

export const ActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('spawn'),
    cmd: z.string(),
    // cols/rows are NOT part of the YAML — they are passed by the caller at runtime
  }),
  z.object({
    action: z.literal('wait_for'),
    pattern: z.string(),
    timeoutMs: z.number().optional().default(10000),
  }),
  z.object({
    action: z.literal('type'),
    text: z.string(),
    submit: z.boolean().optional().default(true),
  }),
  z.object({
    action: z.literal('send_key'),
    key: z.string(),
  }),
  z.object({
    action: z.literal('sleep'),
    ms: z.number().describe('Milliseconds to wait'),
  }),
  z.object({
    action: z.literal('snapshot'),
    format: z.enum(['png', 'txt']).optional().default('txt'),
    outputPath: z.string(),
    /** Hint for the LLM: what to look for / verify in this snapshot. */
    intent: z.string().optional().default(''),
  }),
]);

export type Action = z.infer<typeof ActionSchema>;

export const FlowSchema = z.object({
  version: z.string().optional().default('1.0'),
  description: z.string().optional(),
  steps: z.array(ActionSchema),
});

export type Flow = z.infer<typeof FlowSchema>;

export async function parseFlow(yamlPath: string): Promise<Flow> {
  const content = await fs.readFile(yamlPath, 'utf8');
  const data = yaml.load(content);
  return FlowSchema.parse(data);
}

export function parseFlowFromString(yamlContent: string): Flow {
  const data = yaml.load(yamlContent);
  return FlowSchema.parse(data);
}
