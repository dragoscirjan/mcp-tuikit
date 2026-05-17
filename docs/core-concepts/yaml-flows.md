# YAML Flows

The `run_flow` tool allows the AI agent to execute a pre-defined sequence of interactions against a terminal.

This is highly effective for integration testing or for avoiding back-and-forth roundtrips between the agent and the server for predictable interactions.

## Flow Schema

A flow is a YAML file (or inline YAML string) that defines a sequence of steps. Each step must define an `action` and its corresponding parameters.

Here are all the supported actions according to the schema:

1. **`spawn`**: Starts the command.
   - `cmd`: The command to execute (string).

2. **`wait_for`**: Waits for a regular expression pattern to appear on the screen.
   - `pattern`: The regex string to wait for.
   - `timeoutMs` (optional): Milliseconds to wait before throwing an error. Defaults to `10000`.

3. **`type`**: Types out text.
   - `text`: The string to type.
   - `submit` (optional): Whether to press Enter after typing. Defaults to `true`.

4. **`send_key`**: Sends a specific key combination (e.g., `Escape`, `C-c`).
   - `key`: The key to send.

5. **`sleep`**: Pauses execution for a specific duration.
   - `ms`: Milliseconds to wait.

6. **`snapshot`**: Captures the state of the terminal.
   - `format` (optional): `"png"` or `"txt"`. Defaults to `"txt"`.
   - `outputPath`: The file path to save the snapshot.
   - `intent` (optional): Hint for the LLM regarding what to verify in this snapshot. Defaults to empty string.

## Example

```yaml
version: "1.0"
description: "Neovim Boot Test"
steps:
  - action: "spawn"
    cmd: "nvim"

  - action: "wait_for"
    pattern: "lazy.nvim"
    timeoutMs: 10000

  - action: "snapshot"
    format: "png"
    outputPath: "nvim-boot.png"
    intent: "Neovim loaded successfully"

  - action: "type"
    text: ":qa!"
    submit: true
```

When an agent invokes `run_flow({ yaml_path: 'example-flow.yaml' })`, the Flow Engine will run through the sequence, spawn the session, wait for the expected text, take the snapshot, type the exit command, and return the snapshot paths back to the agent.
