# Contributing to mcp-tuikit

First off, thank you for considering contributing to `mcp-tuikit`! This document outlines the architectural guidelines, toolchain requirements, and development workflows necessary to maintain a robust, cross-platform Node.js and native MCP server.

## 🏗️ Project Structure

We utilize a **pnpm workspaces** monorepo structure to keep the core server and its associated modules organized and interdependencies properly linked:

- **`src/`**: Contains the core MCP server implementation.
- **`packages/`**: Contains separated modules, such as flow engines, native adapters, and other distinct libraries.
- **`tests/`**: Test suites (unit, integration, and e2e) ensuring cross-platform stability.

## 🛠️ Toolchain & Environment

To ensure consistency across different development environments, we enforce strict toolchain management:

1. **Mise**: We use [`mise`](https://mise.jdx.dev/) for managing all programming languages and toolchains (Node.js, Python, C++, Rust, etc.). You must use the provided `.mise.toml` template to guarantee environment parity. Please ensure `mise` is installed and run `mise install` upon cloning the repository.
2. **tmux (Windows)**: The `mcp-tuikit` core relies heavily on `tmux` for headless session management. On Windows, you **must** install `tmux` natively via `winget install arndawg.tmux-windows` (version 3.6a+).
3. **Task Runner**: Since the project leverages `pnpm workspaces` (which can have unfamiliar syntax), we abstract all common development tasks via `.mise.toml`. Use `mise run` for all operations (e.g., `mise run build`, `mise run test`, `mise run lint`). Do not run raw `pnpm` commands manually unless necessary.
4. **Strict Linting & Formatting**: Any new language introduced must have a strict linter and formatter configured (e.g., ESLint/Prettier for TS/JS, `clang-format` for C++, `ruff` for Python). We enforce these via pre-commit hooks (`husky` + `lint-staged`) and continuous integration (CI) pipelines.
5. **Duplicate Code**: We use `jscpd` to detect and prevent copy-pasted code. Keep the codebase DRY. Like formatting, this is enforced via pre-commit hooks and CI.

## 🧪 Development Workflow

1. **Test-Driven Development (TDD)**: TDD is mandatory. We recommend using **`vitest`** for all TypeScript/JavaScript testing. All features and bug fixes must follow the Red-Green-Refactor cycle. Write failing tests first, implement the minimum code to pass, and then refactor. Pull requests without accompanying tests will be rejected.
2. **Cross-Platform Compatibility**: `mcp-tuikit` involves native adapters and Node.js. All code must be designed to run on Windows, macOS, and Linux. Avoid OS-specific hardcoding. Native modules must include robust fallback mechanisms or explicit platform guards.
3. **Error Handling**: Fail fast and gracefully. Provide clear, actionable error messages, especially crossing the boundary between Node.js and native code.
4. **Dependencies & Licensing**: ALWAYS use dependencies and modules that are compatible with the MIT license. Do not introduce packages with restrictive copyleft licenses (like GPL).

## 🎯 Testing Conventions

1. **Unit Tests**: Must be co-located with the implementation file they test inside the `src/` directory of the respective module. File names must end with the `.spec.ts` extension.
2. **Integration Tests**: Must be placed within a dedicated `test/` directory (either at the workspace root or inside a specific module). File names must end with the `.test.ts` extension.

## 📝 Pull Request Process

1. Ensure `mise` environments are active according to the `.mise.toml`.
2. Ensure pre-commit hooks (`husky` and `lint-staged`) run successfully (covering linters, formatters, and `jscpd`).
3. Verify all `vitest` test suites pass (TDD).
4. Submit a PR with a clear description of the problem solved and the architectural approach taken.
