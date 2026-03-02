#!/usr/bin/env node
/**
 * MCP (Model Context Protocol) server for Release Manager.
 * Exposes Release Manager API as MCP tools. Requires the Release Manager app
 * to be running with the API server enabled (default http://127.0.0.1:3847/api).
 *
 * Run: node mcp-server/index.mjs (from repo root) or npm run mcp
 * Configure in Cursor/IDE MCP settings with command: node path/to/release-manager/mcp-server/index.mjs
 */

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const apiDocsPath = path.join(__dirname, '..', 'src-main', 'apiDocs.js');
const { getApiDocs } = require(apiDocsPath);

const API_BASE = process.env.RELEASE_MANAGER_API_URL || 'http://127.0.0.1:3847/api';

async function callReleaseManagerApi(method, params) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params: params || [] }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

async function main() {
  const server = new McpServer(
    {
      name: 'release-manager',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.registerTool(
    'release_manager_list_methods',
    {
      title: 'List Release Manager API methods',
      description:
        'Returns all API method names and their descriptions from Release Manager. Use this to discover available methods before calling release_manager_call. Does not require the app to be running.',
      inputSchema: z.object({}),
    },
    async () => {
      const docs = getApiDocs();
      const list = docs.map((d) => ({
        name: d.name,
        description: d.description || '',
        category: d.category || '',
      }));
      const text = list
        .map((m) => `**${m.name}** (${m.category})\n${m.description}`)
        .join('\n\n');
      return {
        content: [{ type: 'text', text }],
        structuredContent: { methods: list },
      };
    }
  );

  server.registerTool(
    'release_manager_call',
    {
      title: 'Call Release Manager API',
      description: `Call any Release Manager API method. Requires the Release Manager app to be running with API server enabled (default ${API_BASE}). Examples: getProjects (params: []), getBranches (params: [dirPath]), getProjectInfo (params: [dirPath]). Use release_manager_list_methods to see all methods.`,
      inputSchema: z.object({
        method: z.string().describe('API method name (e.g. getProjects, getBranches, getProjectInfo)'),
        params: z
          .array(z.any())
          .default([])
          .describe('Array of arguments for the method (e.g. ["/path/to/project"] for getProjectInfo)'),
      }),
    },
    async ({ method, params }) => {
      try {
        const data = await callReleaseManagerApi(method, params || []);
        const text = JSON.stringify(data, null, 2);
        return {
          content: [{ type: 'text', text }],
          structuredContent: data,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: 'text', text: `Error: ${message}. Ensure Release Manager is running with API server enabled.` }],
          isError: true,
        };
      }
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Release Manager MCP server running on stdio');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
