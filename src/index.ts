#!/usr/bin/env node

import { TmuxBackend } from '@mcp-tuikit/tmux';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'mcp-tuikit',
  version: '1.0.0',
});

const backend = new TmuxBackend();
const activeSessions: Set<string> = new Set();

const closeAllSessions = async () => {
  for (const sessionId of activeSessions) {
    try {
      await backend.closeSession(sessionId);
    } catch (e) {
      console.error(`Failed to close session ${sessionId}:`, e);
    }
  }
  process.exit(0);
};

process.on('SIGINT', closeAllSessions);
process.on('SIGTERM', closeAllSessions);
process.on('uncaughtException', async (err) => {
  console.error('Uncaught exception:', err);
  await closeAllSessions();
});
process.on('exit', () => {
  // Sync fallback, ideally all handled in async events above
});

server.registerTool(
  'create_session',
  {
    description: 'Create a new terminal session',
    inputSchema: z.object({
      command: z.string().describe('Command to run in the session'),
      cols: z.number().default(80).describe('Terminal columns'),
      rows: z.number().default(24).describe('Terminal rows'),
    }),
  },
  async ({ command, cols, rows }) => {
    const sessionId = await backend.createSession(command, cols, rows);
    activeSessions.add(sessionId);
    return {
      content: [{ type: 'text', text: `Session created: ${sessionId}` }],
    };
  },
);

server.registerTool(
  'close_session',
  {
    description: 'Close an existing terminal session',
    inputSchema: z.object({
      session_id: z.string().describe('ID of the session to close'),
    }),
  },
  async ({ session_id }) => {
    await backend.closeSession(session_id);
    activeSessions.delete(session_id);
    return {
      content: [{ type: 'text', text: `Session closed: ${session_id}` }],
    };
  },
);

server.registerTool(
  'send_keys',
  {
    description: 'Send keys to a terminal session',
    inputSchema: z.object({
      session_id: z.string().describe('ID of the session'),
      keys: z.string().describe('Keys to send (tmux format)'),
    }),
  },
  async ({ session_id, keys }) => {
    await backend.sendKeys(session_id, keys);
    return {
      content: [{ type: 'text', text: `Sent keys to ${session_id}` }],
    };
  },
);

server.registerTool(
  'wait_for_text',
  {
    description: 'Wait for text to appear in a terminal session',
    inputSchema: z.object({
      session_id: z.string().describe('ID of the session'),
      pattern: z.string().describe('Regex pattern to wait for'),
      timeout_ms: z.number().default(5000).describe('Timeout in milliseconds'),
    }),
  },
  async ({ session_id, pattern, timeout_ms }) => {
    const found = await backend.waitForText(session_id, pattern, timeout_ms);
    return {
      content: [{ type: 'text', text: found ? 'Pattern found' : 'Timeout reached' }],
    };
  },
);

server.registerTool('list_sessions', { description: 'List active terminal sessions' }, async () => {
  return {
    content: [{ type: 'text', text: `Active sessions: ${Array.from(activeSessions).join(', ')}` }],
  };
});

server.registerResource(
  'terminal_screen_plaintext',
  new ResourceTemplate('terminal://session/{id}/screen.txt?maxLines={limit}', { list: undefined }),
  {
    description: 'Visible terminal buffer. Supports line truncation to avoid context overflow.',
    mimeType: 'text/plain',
  },
  async (uri, variables) => {
    const id = Array.isArray(variables.id) ? variables.id[0] : variables.id;
    const limit = Array.isArray(variables.limit) ? variables.limit[0] : variables.limit;
    const text = await backend.getScreenPlaintext(id, limit ? parseInt(limit as string, 10) : 0);
    return {
      contents: [
        {
          uri: uri.href,
          text,
        },
      ],
    };
  },
);

server.registerResource(
  'terminal_screen_json',
  new ResourceTemplate('terminal://session/{id}/screen.json', { list: undefined }),
  {
    description: 'Buffer with cursor position, dimensions, and session state (alive, blocked).',
    mimeType: 'application/json',
  },
  async (uri, variables) => {
    const id = Array.isArray(variables.id) ? variables.id[0] : variables.id;
    const json = await backend.getScreenJson(id);
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(json, null, 2),
        },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
