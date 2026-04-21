---
id: "00014"
type: hld
title: "Documentation Website HLD"
version: 1
status: draft
parent: "00029"
opencode-agent: tech-lead
---

# Documentation Website HLD

## 1. Executive Summary
This document outlines the High-Level Design (HLD) for the `mcp-tuikit` documentation website. The primary audience for this documentation is AI Developers and Software Engineers using Large Language Models (LLMs) to develop, debug, and test Terminal User Interface (TUI) applications.

The goal is to provide a clean, easily navigable, and highly indexable site that explains how to integrate and leverage the MCP server's tools (`create_session`, `run_flow`, etc.).

## 2. Technology Stack Selection

**Chosen Framework:** MkDocs with the Material Theme (`mkdocs-material`)
**Toolchain Manager:** `uv` (for Python dependency management)

### 2.1 Justification
While the repository is predominantly TypeScript/Node.js based using `pnpm workspaces`, `mcp-tuikit` already relies on a multi-language environment managed by `mise`. 
- **LLM/Agent Friendly:** MkDocs Material generates extremely clean, semantic HTML that is easily parseable by LLMs and search engines.
- **Maintenance:** It uses simple Markdown. Our ecosystem tooling (specifically the AI "Tech Writer" role) is already optimized to scaffold and maintain MkDocs projects via `uv run mkdocs build`.
- **Search:** Out-of-the-box, client-side search is fast and excellent for quickly looking up MCP tool names and parameters.
- **Integration:** We will configure `mise` to expose a `mise run docs:build` task that wraps the `uv` commands, maintaining the unified developer experience defined in `CONTRIBUTING.md`.

## 3. Information Architecture (Site Structure)

The documentation will be structured into four main pillars, adhering to established technical writing standards:

1. **Home (`index.md`)**
   - Hero section with value proposition (Bridging LLMs and TUIs).
   - Quick Start / Installation instructions.
2. **Guide (Tutorials & Workflows)**
   - Core Concepts (Sessions, Snapshots, Backends).
   - LLM Integration Guide (Prompting best practices, how to pass MCP tools to Claude/Cursor/etc.).
   - Writing TUI Flows (The YAML flow syntax).
3. **Reference (API & Tools)**
   - Complete list of MCP Tools (e.g., `mcp-tuikit-dev_create_session`, `mcp-tuikit-dev_run_flow`).
   - Configuration & Environment Variables (`.env` setup).
   - Supported Native Backends (Kitty, Ghostty, Alacritty, Xterm.js).
4. **Project (Meta)**
   - Contributing Guide (mirrored or linked from `CONTRIBUTING.md`).
   - Architecture & Design Docs (links to these `.specs/`).
   - Changelog.

## 4. Deployment Strategy

**Hosting:** GitHub Pages
**CI/CD:** GitHub Actions

### 4.1 Workflow
1. A new GitHub Action workflow (`.github/workflows/docs.yml`) will be created.
2. It will trigger on pushes to the `main` branch when changes occur in the `docs/` directory or `mkdocs.yml`.
3. The pipeline will setup `mise`, install `uv`, build the site using `uv run mkdocs build --strict`, and deploy the resulting `site/` folder to the `gh-pages` branch.

## 5. Answers to Open Questions
- **Auto-Generation:** Yes, the reference section should be auto-generated from all sub-modules (`packages/*`), not just `packages/core`.
- **Visuals:** Undecided. We will evaluate adding visual PNG snapshots at a later stage as the documentation evolves.
- **Framework:** MkDocs with `mkdocs-material` is approved.

