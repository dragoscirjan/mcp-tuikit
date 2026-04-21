# Using with LLMs

The primary audience for `mcp-tuikit` consists of developers who want to use LLMs (like Claude, Cursor, ChatGPT, etc.) to help debug or develop Terminal User Interfaces (TUIs).

Since LLMs normally can't "see" what an interactive terminal renders, they often struggle when providing instructions or debugging curses-based apps, terminal graphs, and interactive prompts. `mcp-tuikit` fixes this by exposing your terminal as tools that the LLM can use autonomously.

## Configuring Claude Desktop

To add `mcp-tuikit` to your Claude Desktop application, modify your `claude_desktop_config.json` file.

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "tuikit": {
      "command": "npx",
      "args": ["-y", "@dragoscirjan/mcp-tuikit"]
    }
  }
}
```

## Configuring Cursor AI

If you are using Cursor, you can add an MCP server locally to your editor.

1. Open **Cursor Settings** (Cmd + Shift + J > "MCP Settings")
2. Click **+ Add MCP Server**
3. Select **command** type
4. Set Name: `tuikit`
5. Set Command: `npx -y @dragoscirjan/mcp-tuikit`

## Prompting Best Practices

When you interact with the LLM, you want to guide it on how to use the server. Here is an example of an effective prompt you can give to Claude:

> "I need to debug the new layout of our `btop` process. Use the `mcp-tuikit` tools to:
>
> 1. Create a new session with dimensions 120x40.
> 2. Send the keys `btop\n`.
> 3. Wait for the text `CPU` to appear.
> 4. Take a PNG and TXT snapshot of the terminal so you can see the layout.
> 5. Review the text snapshot and tell me if the alignment looks correct."

### Automating via `run_flow`

Instead of having the LLM make 5 different tool calls sequentially (which can be slow and prone to timing errors), you can instruct the LLM to write a YAML file and use the `run_flow` tool to execute it all at once in an isolated sandbox.

See [YAML Flow Syntax](yaml-flows.md) for more details.
