# @templ-project/prettier

A comprehensive, opinionated Prettier configuration designed for JavaScript and TypeScript projects. This package provides a portable formatting configuration that ensures consistent code style across projects and can be used as-is or extended for custom needs.

- [@templ-project/prettier](#templ-projectprettier)
  - [Features](#features)
  - [Installation](#installation)
  - [Module Compatibility](#module-compatibility)
    - [ESM Projects](#esm-projects)
    - [CommonJS Projects](#commonjs-projects)
    - [Package.json Configuration](#packagejson-configuration)
  - [Usage](#usage)
    - [Basic Usage](#basic-usage)
      - [Option 1: Package.json (Recommended)](#option-1-packagejson-recommended)
      - [Option 2: Configuration File](#option-2-configuration-file)
    - [Extending the Configuration](#extending-the-configuration)
    - [CLI Usage](#cli-usage)
  - [Configuration Details](#configuration-details)
    - [Core Settings](#core-settings)
    - [File-Specific Overrides](#file-specific-overrides)
      - [JSON Files (`*.json`, `*.jsonc`, `*.json5`)](#json-files-json-jsonc-json5)
      - [JavaScript Files (`*.js`)](#javascript-files-js)
      - [Markdown Files (`*.md`)](#markdown-files-md)
      - [YAML Files (`*.yaml`, `*.yml`)](#yaml-files-yaml-yml)
      - [TOML Files (`*.toml`)](#toml-files-toml)
  - [Supported File Types](#supported-file-types)
    - [JavaScript \& TypeScript](#javascript--typescript)
    - [JSON Files](#json-files)
    - [Markdown Files](#markdown-files)
    - [YAML Files](#yaml-files)
    - [TOML Files](#toml-files)
  - [Import Sorting](#import-sorting)
  - [Integration](#integration)
    - [VS Code Integration](#vs-code-integration)
    - [ESLint Integration](#eslint-integration)
    - [Git Hooks Integration](#git-hooks-integration)
  - [Testing](#testing)
  - [Common Use Cases](#common-use-cases)
    - [New Project Setup](#new-project-setup)
    - [Existing Project Migration](#existing-project-migration)
    - [Monorepo Configuration](#monorepo-configuration)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
  - [Contributing](#contributing)
  - [Changelog](#changelog)
  - [License](#license)

## Features

- **Opinionated formatting**: Consistent, modern code style across all supported languages
- **Multi-language support**: JavaScript, TypeScript, JSON, Markdown, YAML, and TOML files
- **Import sorting**: Automatic import statement organization with `prettier-plugin-import-sort`
- **File-specific parsing**: Optimized parsers for different file types
- **Dual module support**: Both ESM and CommonJS compatible
- **Zero configuration**: Works out of the box with sensible defaults
- **Extensible**: Easy to override or extend for custom requirements

## Installation

```bash
npm install --save-dev @templ-project/prettier
```

This package includes Prettier and all necessary plugins, so you don't need to install them separately.

## Module Compatibility

This package provides **dual module support** with both ESM and CommonJS exports, making it compatible with any project setup:

### ESM Projects

For projects using ES modules:

```javascript
// prettier.config.js
import prettierConfig from "@templ-project/prettier";

export default prettierConfig;
```

### CommonJS Projects

For CommonJS projects:

```javascript
// prettier.config.js
const prettierConfig = require("@templ-project/prettier");

module.exports = prettierConfig;
```

### Package.json Configuration

The simplest approach for any project:

```json
{
  "prettier": "@templ-project/prettier"
}
```

## Usage

### Basic Usage

#### Option 1: Package.json (Recommended)

Add to your `package.json`:

```json
{
  "prettier": "@templ-project/prettier"
}
```

#### Option 2: Configuration File

Create a `prettier.config.js` file:

```javascript
// ESM
import prettierConfig from "@templ-project/prettier";
export default prettierConfig;

// CommonJS
module.exports = require("@templ-project/prettier");
```

### Extending the Configuration

You can extend the base configuration with your own overrides:

```javascript
// prettier.config.js
import baseConfig from "@templ-project/prettier";

export default {
  ...baseConfig,
  // Your custom overrides
  printWidth: 100,
  semi: false,
  overrides: [
    ...baseConfig.overrides,
    {
      files: "*.vue",
      options: {
        parser: "vue",
      },
    },
  ],
};
```

### CLI Usage

Format your code using the Prettier CLI:

```bash
# Format all supported files
npx prettier --write .

# Check formatting without making changes
npx prettier --check .

# Format specific files
npx prettier --write src/**/*.{js,ts,json,md}
```

## Configuration Details

### Core Settings

| Setting          | Value          | Description                                |
| ---------------- | -------------- | ------------------------------------------ |
| `printWidth`     | `120`          | Maximum line length before wrapping        |
| `tabWidth`       | `2`            | Number of spaces per indentation level     |
| `semi`           | `true`         | Always add semicolons                      |
| `singleQuote`    | `true`         | Use single quotes instead of double quotes |
| `trailingComma`  | `"all"`        | Add trailing commas wherever possible      |
| `bracketSpacing` | `true`         | Add spaces inside object literals          |
| `parser`         | `"typescript"` | Default parser for most files              |

### File-Specific Overrides

The configuration includes specialized settings for different file types:

#### JSON Files (`*.json`, `*.jsonc`, `*.json5`)

- **Parser**: Specific JSON parsers for each variant
- **Quotes**: Double quotes (JSON standard)
- **Comments**: Supported in JSONC files

#### JavaScript Files (`*.js`)

- **Parser**: Babel parser for modern JavaScript features
- **Quotes**: Single quotes (following core settings)

#### Markdown Files (`*.md`)

- **Parser**: Markdown parser
- **Quotes**: Double quotes for readability
- **Prose Wrap**: `"preserve"` - maintains original line breaks

#### YAML Files (`*.yaml`, `*.yml`)

- **Parser**: YAML parser (built-in Prettier support)
- **Quotes**: Single quotes (aligned with ESLint)
- **Indentation**: 2 spaces (consistent with global settings)

#### TOML Files (`*.toml`)

- **Parser**: TOML parser (via `prettier-plugin-toml`)
- **Indentation**: 2 spaces (consistent with global settings)
- **Alignment**: No automatic comment or entry alignment for readability

## Supported File Types

### JavaScript & TypeScript

- **Extensions**: `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`
- **Parser**: TypeScript parser (handles both JS and TS)
- **Features**: Modern syntax support, JSX formatting

### JSON Files

- **Extensions**: `.json`, `.jsonc`, `.json5`
- **Parsers**:
  - `json` for standard JSON files
  - `jsonc` for JSON with comments
  - `json5` for JSON5 enhanced syntax
- **Features**: Proper quote handling, comment preservation

### Markdown Files

- **Extensions**: `.md`, `.markdown`
- **Parser**: Markdown parser
- **Features**: Code block formatting, prose wrapping control

### YAML Files

- **Extensions**: `.yml`, `.yaml`
- **Parser**: YAML parser (via Prettier's built-in support)
- **Features**: Consistent indentation and structure

### TOML Files

- **Extensions**: `.toml`
- **Parser**: TOML parser (via `prettier-plugin-toml`)
- **Features**: Configuration file formatting, consistent structure
- **Options**: No automatic alignment for better readability

## Import Sorting

This configuration includes automatic import sorting via `prettier-plugin-import-sort`:

- **Grouping**: Built-in modules, external packages, internal modules
- **Ordering**: Alphabetical within each group
- **Style**: Module style sorting
- **Automatic**: Runs as part of Prettier formatting

Example of sorted imports:

```javascript
// Built-in Node.js modules
import fs from "node:fs";
import path from "node:path";

// External packages
import express from "express";
import lodash from "lodash";

// Internal modules
import { config } from "./config.js";
import { utils } from "../utils/index.js";
```

## Integration

### VS Code Integration

Add to your VS Code settings:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### ESLint Integration

This configuration is designed to work seamlessly with `@templ-project/eslint`:

```javascript
// eslint.config.mjs
import templEslintConfig from "@templ-project/eslint";

export default templEslintConfig; // Includes Prettier integration
```

### Git Hooks Integration

Use with lint-staged for pre-commit formatting:

```json
{
  "lint-staged": {
    "**/*.{js,ts,json,md,yaml}": ["prettier --write"]
  }
}
```

## Testing

The package includes a comprehensive test suite that validates:

- ✅ **Formatting consistency**: Files are formatted according to configuration
- ✅ **Parser selection**: Correct parsers are used for each file type
- ✅ **Override application**: File-specific settings are applied correctly
- 🧪 **Multi-format support**: All supported file extensions are tested

Run tests:

```bash
npm test
```

Test files are organized as:

- `test/success/` - Files that should format correctly
- `test/failure/` - Files that should fail formatting (if any)

## Common Use Cases

### New Project Setup

```bash
# Install the configuration
npm install --save-dev @templ-project/prettier

# Add to package.json
echo '{"prettier": "@templ-project/prettier"}' > .prettierrc.json

# Format your project
npx prettier --write .
```

### Existing Project Migration

```javascript
// prettier.config.js - Gradual migration approach
import baseConfig from "@templ-project/prettier";

export default {
  ...baseConfig,
  // Temporarily more lenient settings during migration
  printWidth: 140, // Wider during transition
  // Gradually adopt stricter settings
};
```

### Monorepo Configuration

```javascript
// prettier.config.js - Root configuration
import baseConfig from "@templ-project/prettier";

export default {
  ...baseConfig,
  overrides: [
    ...baseConfig.overrides,
    {
      files: "packages/legacy/**",
      options: {
        // Different settings for legacy packages
        printWidth: 100,
        semi: false,
      },
    },
    {
      files: "docs/**/*.md",
      options: {
        proseWrap: "always",
      },
    },
  ],
};
```

## Troubleshooting

### Common Issues

**Configuration not being picked up**: Ensure you're using one of the supported configuration methods (package.json, prettier.config.js, etc.)

**Import sorting not working**: Verify that `prettier-plugin-import-sort` is installed (included with this package)

**File not being formatted**: Check that the file extension is supported. Add custom overrides for additional file types.

**Conflicts with ESLint**: Use `@templ-project/eslint` which includes Prettier integration, or configure `eslint-config-prettier` manually.

**Performance issues**: Consider using `.prettierignore` to exclude large files or directories:

```
# .prettierignore
node_modules/
dist/
coverage/
*.min.js
```

## Contributing

This package is part of the Templ Project ecosystem. See the main repository for contribution guidelines.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and changes.

## License

MIT © Dragos Cirjan
