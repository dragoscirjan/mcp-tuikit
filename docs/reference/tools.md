# MCP Tools & Resources

`mcp-tuikit` exposes a suite of MCP tools and resources that allow the AI agent to orchestrate the terminal.

## Available Tools

| Tool                  | Parameters                                                                         | Description                                                                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`create_session`**  | `command` (string), `cols` (number, default: 80), `rows` (number, default: 30)     | Creates a new terminal session and opens the configured terminal window. Returns the `session_id`.                                                               |
| **`close_session`**   | `session_id` (string)                                                              | Closes a terminal session and destroys its terminal window.                                                                                                      |
| **`create_snapshot`** | `session_id` (string), `format` (enum: txt, png, both), `intent` (optional string) | Captures a textual and/or visual PNG snapshot from an active session. Snapshots are saved to the local file system, and paths are returned to the agent.         |
| **`send_keys`**       | `session_id` (string), `keys` (string), `submit` (boolean, default: false)         | Sends keystrokes to the terminal session. Keys should be in `tmux` format (e.g., `C-c` for Ctrl+C). If `submit` is true, an Enter key is automatically appended. |
| **`wait_for_text`**   | `session_id` (string), `pattern` (string), `timeout_ms` (number, default: 5000)    | Suspends execution until a specific regex pattern appears in the terminal output. Excellent for waiting until a CLI tool finishes loading.                       |
| **`run_flow`**        | `yaml_path` (optional string), `yaml_string` (optional string), `cols`, `rows`     | Runs a multi-step TUI flow autonomously using the internal Flow Engine.                                                                                          |
| **`list_sessions`**   | _none_                                                                             | Lists all active terminal sessions created by the server.                                                                                                        |

## Available Resources

| Resource URI                                          | Description                                                                                                                                                                                  |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `terminal://session/{id}/screen.txt?maxLines={limit}` | **Plaintext terminal buffer.** Exposes the live ANSI-stripped textual representation of the terminal screen. Agents can "read" this resource to see exactly what is on the screen right now. |
