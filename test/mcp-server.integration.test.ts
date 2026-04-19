import fs from 'node:fs/promises';
import process from 'node:process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

interface ToolResponseContent {
  type: string;
  text: string;
}

interface ArtifactResult {
  path: string;
  format: string;
}

describe('MCP Server Integration', () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/index.js'],
      env: { ...process.env, TUIKIT_HEADLESS: '1' },
    });
    client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
    await client.connect(transport);
  });

  afterAll(async () => {
    await transport.close();
  });

  it('runs echo loop and captures output via MCP tools', async () => {
    // 1. Create Session
    const createRes = await client.callTool({
      name: 'create_session',
      arguments: { command: 'bash', cols: 80, rows: 24 },
    });
    if (createRes.isError) console.error(createRes);
    expect(createRes.isError).toBeFalsy();
    const createResContent = createRes.content as unknown as ToolResponseContent[];
    const sessionData = JSON.parse(createResContent[0].text);
    const sessionId = sessionData.sessionName;
    expect(sessionId).toBeDefined();

    // 2. Send keys (echo loop)
    const keysRes = await client.callTool({
      name: 'send_keys',
      arguments: {
        session_id: sessionId,
        keys: 'for i in {1..5}; do echo LLM_TEST_OUTPUT_\\$i; sleep 0.1; done',
        submit: true,
      },
    });
    expect(keysRes.isError).toBeFalsy();

    // 3. Wait for text
    const waitRes = await client.callTool({
      name: 'wait_for_text',
      arguments: {
        session_id: sessionId,
        pattern: 'LLM_TEST_OUTPUT_5',
        timeout_ms: 10000,
      },
    });
    if (waitRes.isError) {
      console.error('Wait Res Error:', JSON.stringify(waitRes.content));
    }
    expect(waitRes.isError).toBeFalsy();

    // 4. Create Snapshot
    const snapRes = await client.callTool({
      name: 'create_snapshot',
      arguments: {
        session_id: sessionId,
        format: 'both',
      },
    });
    expect(snapRes.isError).toBeFalsy();
    const snapResContent = snapRes.content as unknown as ToolResponseContent[];
    const artifacts = JSON.parse(snapResContent[0].text) as ArtifactResult[];

    const txtArtifact = artifacts.find((a) => a.format === 'txt');
    const pngArtifact = artifacts.find((a) => a.format === 'png');

    expect(txtArtifact).toBeDefined();
    expect(pngArtifact).toBeDefined();

    const txtContent = await fs.readFile(txtArtifact!.path, 'utf-8');
    expect(txtContent).toContain('LLM_TEST_OUTPUT_5');

    const pngStat = await fs.stat(pngArtifact!.path);
    expect(pngStat.size).toBeGreaterThan(0);

    // 5. Close Session
    const closeRes = await client.callTool({
      name: 'close_session',
      arguments: { session_id: sessionId },
    });
    expect(closeRes.isError).toBeFalsy();
  }, 30000);
});
