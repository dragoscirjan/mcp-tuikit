# MCP Tools Reference

The `mcp-tuikit` server currently exposes several core tools specifically designed for LLM and TUI integration. This page outlines the available functionality and parameters.

!!! tip "Work in Progress"
This reference section is currently manually maintained, but will soon be auto-generated from the TypeScript definitions in `packages/*`.

---

### `mcp-tuikit-dev_create_session`

Creates a new background terminal session (via `tmux`) and opens the configured native terminal window (if applicable). This is the starting point for manual TUI testing.

**Parameters:**

- `command` _(string, required)_: The command to run inside the terminal session (e.g., `bash`, `python app.py`).
- `cols` _(number, optional)_: Terminal width in columns.
- `rows` _(number, optional)_: Terminal height in rows.

---

### `mcp-tuikit-dev_close_session`

Closes a running terminal session and its associated terminal window, freeing up system resources.

**Parameters:**

- `session_id` _(string, required)_: The unique Session ID returned by `create_session`.

---

### `mcp-tuikit-dev_create_snapshot`

Captures a precise `txt` and/or `png` snapshot of the active terminal session. This allows the LLM to read the current state of a curses app, progress bar, or interactive prompt.

**Parameters:**

- `session_id` _(string, required)_: The active Session ID.
- `format` _(enum: txt, png, both)_: The snapshot format to capture.
- `intent` _(string, optional)_: A human-readable intent/label describing the snapshot.

---

### `mcp-tuikit-dev_send_keys`

Sends keystrokes directly to the active terminal session, simulating human keyboard input.

**Parameters:**

- `session_id` _(string, required)_: The active Session ID.
- `keys` _(string, required)_: The string to type (supports tmux format for special characters).
- `submit` _(boolean, optional)_: If `true`, automatically appends an `Enter` keystroke after typing.

---

### `mcp-tuikit-dev_wait_for_text`

Blocks execution and polls the terminal screen until a specific regular expression pattern appears in the output. Useful for waiting for a TUI app to finish loading before taking a snapshot.

**Parameters:**

- `session_id` _(string, required)_: The active Session ID.
- `pattern` _(string, required)_: The regex pattern to wait for.
- `timeout_ms` _(number, optional)_: How long to wait before timing out (in milliseconds).

---

### `mcp-tuikit-dev_run_flow`

Instead of calling individual tools one by one, `run_flow` reads a declarative YAML file that spawns a session, sends keys, takes snapshots, and closes the session automatically in an isolated environment.

**Parameters:**

- `yaml_path` _(string, optional)_: Absolute or relative path to a YAML flow definition file.
- `yaml_string` _(string, optional)_: Inline YAML flow definition (if passing the flow directly from the LLM prompt).
- `cols` _(number, optional)_: Terminal width override.
- `rows` _(number, optional)_: Terminal height override.

---

### `mcp-tuikit-dev_list_sessions`

Lists all active terminal sessions currently managed by `mcp-tuikit`. This helps the LLM debug state if it loses track of its session IDs.

**Parameters:**
_(None)_
