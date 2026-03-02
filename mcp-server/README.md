# Shipwell MCP Server

Model Context Protocol (MCP) server that exposes [Shipwell](https://github.com/your-org/shipwell) as tools for AI assistants (e.g. Cursor, Claude Desktop).

## Requirements

- Node.js 18+
- Shipwell app with **API server enabled** (for `release_manager_call`). The app must be running and the API server turned on in **API** → **Enable API server** (default port 3847).

## Tools

| Tool | Description |
|------|-------------|
| **release_manager_list_methods** | List all API method names and descriptions. Does not require the app to be running. |
| **release_manager_call** | Call any Shipwell API method (e.g. `getProjects`, `getBranches`, `getProjectInfo`). Requires the app with API server enabled. |

## Run from repo root

```bash
npm run mcp
```

Or directly:

```bash
node mcp-server/index.mjs
```

## Cursor MCP configuration

Add to your Cursor MCP settings (e.g. `~/.cursor/mcp.json` or project `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "shipwell": {
      "command": "node",
      "args": ["/absolute/path/to/shipwell/mcp-server/index.mjs"]
    }
  }
}
```

Replace `/absolute/path/to/shipwell` with the real path to the repo.

## Environment

- **RELEASE_MANAGER_API_URL** – Override API base URL (default: `http://127.0.0.1:3847/api`).

## Example

1. Start Shipwell, open **API**, enable the API server.
2. In Cursor, use the Shipwell MCP server.
3. Ask the assistant to “list my Shipwell projects” – it can call `release_manager_list_methods` then `release_manager_call` with `getProjects` or `getAllProjectsInfo`.
