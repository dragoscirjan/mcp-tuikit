# Setup with LLMs

Configuring your AI assistant to use `mcp-tuikit` depends on the editor or agent you are using.

## Claude Code

You can add `mcp-tuikit` to Claude Code using the built-in MCP manager:

```bash
claude mcp add mcp-tuikit -- npx -y @dragoscirjan/mcp-tuikit
```

## Cursor

To use `mcp-tuikit` across all projects in Cursor, add it to your global `~/.cursor/mcp.json` file:

```json
{
  "mcpServers": {
    "mcp-tuikit": {
      "command": "npx",
      "args": ["-y", "@dragoscirjan/mcp-tuikit"]
    }
  }
}
```

## Windsurf

Windsurf supports global MCP configurations. Add the following to your Windsurf MCP config:

```json
{
  "mcpServers": {
    "mcp-tuikit": {
      "command": "npx",
      "args": ["-y", "@dragoscirjan/mcp-tuikit"]
    }
  }
}
```

## OpenCode

For OpenCode, update your `~/.config/opencode/config.json`:

```json
{
  "mcp": {
    "mcp-tuikit": {
      "type": "local",
      "command": ["npx", "-y", "@dragoscirjan/mcp-tuikit"]
    }
  }
}
```
