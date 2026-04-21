# Contributing

Welcome to `mcp-tuikit`! If you're looking to contribute to the core MCP server, native terminal backends, or the flow engine, please read our contribution guidelines.

Because this project spans multiple languages (Node.js, Python for Docs, and potentially native C++/Rust bindings in the future), we strictly enforce a standardized toolchain using `mise`.

## The Guidelines

Our complete, up-to-date guidelines for contributing are stored at the root of the repository in [`CONTRIBUTING.md`](https://github.com/dragoscirjan/mcp-tuikit/blob/main/CONTRIBUTING.md).

Here is a brief overview:

1. **Toolchain (`mise`)**: You MUST use `mise` to manage Node.js, Python, and pnpm versions.
2. **Pnpm Workspaces**: Use the `mise run build`, `mise run test`, and `mise run lint` commands to run scripts across all `packages/` modules. Do not run naked `pnpm` commands manually unless necessary.
3. **TDD (Test-Driven Development)**: All TypeScript testing is powered by `vitest`. PRs without accompanying tests (`.spec.ts` for unit, `.test.ts` for integration) will be rejected.
4. **Cross-Platform Support**: Keep in mind that terminal snapshots operate on Linux, macOS, and Windows. Avoid hardcoding OS-specific commands without proper fallback checks.

### Running Documentation Locally

If you are contributing to this documentation site, run:

```bash
mise run docs:serve
```

This will spin up a live-reloading MkDocs instance on `http://127.0.0.1:8000`.

Thank you for helping us bridge the gap between LLMs and TUI applications!
