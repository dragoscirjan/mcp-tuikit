# @templ-project/eslint

A comprehensive, modular ESLint configuration designed for JavaScript and TypeScript projects. This package provides a portable, opinionated set of linting rules that can be used across multiple projects to ensure consistent code quality and style.

- [@templ-project/eslint](#templ-projecteslint)
  - [Features](#features)
  - [Installation](#installation)
  - [Module Compatibility](#module-compatibility)
    - [ESM Projects](#esm-projects)
    - [CommonJS Projects](#commonjs-projects)
  - [Usage](#usage)
    - [Basic Usage](#basic-usage)
    - [Extending the Configuration](#extending-the-configuration)
    - [Factory Function API (Advanced Usage)](#factory-function-api-advanced-usage)
    - [Individual Rule Set Functions](#individual-rule-set-functions)
    - [Adding Custom Ignores](#adding-custom-ignores)
  - [Supported File Types](#supported-file-types)
    - [JavaScript \& TypeScript](#javascript--typescript)
    - [JSON Files](#json-files)
    - [YAML Files](#yaml-files)
    - [TOML Files](#toml-files)
    - [Markdown Files](#markdown-files)
    - [Text Files](#text-files)
  - [Rule Categories](#rule-categories)
    - [Code Quality Rules](#code-quality-rules)
    - [Code Style Rules](#code-style-rules)
    - [File-Specific Rules](#file-specific-rules)
  - [Architecture](#architecture)
    - [Rule Loading Order](#rule-loading-order)
  - [Default Ignores](#default-ignores)
  - [Testing](#testing)
  - [Prettier Integration](#prettier-integration)
  - [TypeScript Configuration](#typescript-configuration)
    - [Key TypeScript Rules](#key-typescript-rules)
  - [Node.js Integration](#nodejs-integration)
  - [Performance Considerations](#performance-considerations)
  - [Common Use Cases](#common-use-cases)
    - [New Project Setup](#new-project-setup)
    - [Existing Project Migration](#existing-project-migration)
    - [Monorepo Configuration](#monorepo-configuration)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
    - [Debug Mode](#debug-mode)
  - [Contributing](#contributing)
  - [Changelog](#changelog)
  - [License](#license)

## Features

- **Multi-language support**: JavaScript, TypeScript, JSON, YAML, TOML, Markdown, and text files
- **Modular architecture**: Organized rule sets for different file types
- **Framework integration**: Built-in support for Vitest testing framework
- **Prettier integration**: Seamless code formatting with conflict resolution
- **TypeScript-aware**: Advanced TypeScript linting with type checking
- **Import management**: Automatic import ordering and Node.js protocol enforcement
- **Portable**: Use as-is or extend for custom needs

## Installation

```bash
npm install --save-dev @templ-project/eslint
```

This package includes all necessary dependencies, so you don't need to install ESLint or any plugins separately.

## Module Compatibility

This package is **ESM-only** (`"type": "module"`), but it can be used in both ESM and CommonJS projects:

### ESM Projects

For projects using ES modules, use the standard `.js` extension:

```javascript
// eslint.config.js
import templEslintConfig from "@templ-project/eslint";

export default templEslintConfig;
```

### CommonJS Projects

For CommonJS projects, use the `.mjs` extension for your ESLint configuration file:

```javascript
// eslint.config.mjs (note the .mjs extension)
import templEslintConfig from "@templ-project/eslint";

export default templEslintConfig;
```

The `.mjs` extension tells Node.js to treat the ESLint configuration file as an ES module, while the rest of your project can remain CommonJS. ESLint supports this pattern natively.

**Note**: You cannot directly `require()` this package in CommonJS code. The ESLint configuration file must use ES module syntax with the `.mjs` extension.

## Usage

### Basic Usage

Create an `eslint.config.mjs` file in your project root:

```javascript
import templEslintConfig from "@templ-project/eslint";

export default templEslintConfig;
```

### Extending the Configuration

You can extend the base configuration with your own rules:

```javascript
import templEslintConfig from "@templ-project/eslint";

export default [
  ...templEslintConfig,
  {
    // Your custom overrides
    rules: {
      "no-console": "warn",
      "@typescript-eslint/no-unused-vars": "error",
    },
  },
];
```

### Factory Function API (Advanced Usage)

For more control over the configuration, you can use the factory function approach:

```javascript
import { createEslintConfig } from "@templ-project/eslint";

// Basic usage with all defaults
export default createEslintConfig();
```

```javascript
// Alternative: Selective feature toggles
import { createEslintConfig } from "@templ-project/eslint";

export default createEslintConfig({
  enableTypeScript: true, // Enable TypeScript rules (default: true)
  enablePrettier: true, // Enable Prettier integration (default: true)
  enableYaml: false, // Disable YAML linting (default: true)
  enableJson: true, // Enable JSON linting (default: true)
  enableMarkdown: false, // Disable Markdown linting (default: true)
  enableText: true, // Enable text file linting (default: true)
  enableVitest: true, // Enable Vitest test rules (default: true)
});
```

```javascript
// Alternative: Custom rules and overrides
import { createEslintConfig } from "@templ-project/eslint";
export default createEslintConfig({
  rules: {
    "no-console": "warn", // Global rule override
    "max-len": ["error", { code: 100 }], // Custom line length
    prettier: {
      // Prettier-specific rules
      "prettier/prettier": ["error", { printWidth: 100 }],
    },
    typescript: {
      // TypeScript-specific rules
      "@typescript-eslint/no-unused-vars": "error",
    },
  },
  ignores: ["dist/**", "build/**"], // Custom ignore patterns
  languageOptions: {
    // Custom language options
    ecmaVersion: 2022,
  },
});
```

```javascript
// Alternative: Disable TypeScript but keep JavaScript
import { createEslintConfig } from "@templ-project/eslint";

export default createEslintConfig({
  enableTypeScript: false, // Only JavaScript rules will be applied
});
```

### Individual Rule Set Functions

You can also use individual rule set functions for granular control:

```javascript
import { createJsAndTsConfig, createPrettierConfig, createYamlConfig } from "@templ-project/eslint";

export default [
  // Global ignores
  { ignores: ["dist/**"] },

  // Only JavaScript/TypeScript and Prettier rules
  ...createJsAndTsConfig({ enableTypeScript: true }),
  ...createPrettierConfig(),

  // Custom overrides
  {
    rules: {
      "no-console": "warn",
    },
  },
];
```

### Adding Custom Ignores

```javascript
import templEslintConfig from "@templ-project/eslint";

export default [
  {
    ignores: ["custom-build/**", "legacy-code/**"],
  },
  ...templEslintConfig,
];
```

## Supported File Types

### JavaScript & TypeScript

- **Files**: `*.js`, `*.mjs`, `*.cjs`, `*.jsx`, `*.ts`, `*.mts`, `*.cts`, `*.tsx`
- **Features**:
  - ES6+ syntax support
  - TypeScript type-aware linting
  - Import/export validation and ordering
  - Node.js built-in protocol enforcement (`node:` prefix)
  - Vitest testing framework support

### JSON Files

- **Files**: `*.json`, `*.jsonc`, `*.json5`, `tsconfig*.json`
- **Features**:
  - JSON syntax validation
  - JSONC (JSON with Comments) support
  - JSON5 enhanced syntax support
  - Automatic exclusion of lock files and build artifacts

### YAML Files

- **Files**: `*.yaml`, `*.yml`
- **Features**:
  - YAML syntax validation
  - Consistent indentation (2 spaces)
  - Single quote preference
  - Empty document detection

### TOML Files

- **Files**: `*.toml`
- **Features**:
  - TOML syntax validation
  - Consistent indentation (2 spaces)
  - Configuration file linting
  - Standard compliance checking

### Markdown Files

- **Files**: `*.md`
- **Features**:
  - Code block validation
  - Relaxed rules for documentation examples
  - JavaScript code block linting

### Text Files

- **Files**: `*.txt`, and other text-based files
- **Features**:
  - End-of-line consistency
  - Basic text file formatting

## Rule Categories

### Code Quality Rules

- **Import Management**: Automatic import ordering and validation
- **TypeScript**: Strict type checking with practical exceptions
- **Node.js**: Prefer Node.js protocol imports (`node:fs` vs `fs`)
- **Testing**: Vitest-specific rules for test files

### Code Style Rules

- **Quotes**: Single quotes preferred (except in JSON)
- **Semicolons**: Always required
- **Indentation**: 2 spaces consistently
- **Line Length**: 120 characters maximum
- **Trailing Commas**: Required in multiline structures
- **Object Spacing**: Consistent bracket spacing

### File-Specific Rules

- **Test Files**: Relaxed rules for `*.test.*`, `*.spec.*`, `*.e2e.*` files
- **Markdown Code Blocks**: Disabled import resolution and console warnings
- **JSON**: No irregular whitespace rules
- **YAML**: Enforced single quotes and consistent indentation

## Architecture

The configuration is built with a modular architecture:

```
packages/eslint/
├── index.js              # Main entry point
├── rules/
│   ├── js-and-ts.js      # JavaScript & TypeScript rules
│   ├── json.js           # JSON file rules
│   ├── markdown.js       # Markdown file rules
│   ├── prettier.js       # Prettier integration
│   ├── text.js           # Text file rules
│   └── yaml.js           # YAML file rules
└── test/                 # Comprehensive test suite
```

### Rule Loading Order

The configuration loads rules in a specific order to ensure proper precedence:

1. **Global ignores** - Files to skip entirely
2. **JavaScript/TypeScript** - Core language rules
3. **Prettier** - Code formatting integration
4. **YAML** - YAML-specific rules
5. **JSON** - JSON-specific rules
6. **Text** - Text file rules
7. **Markdown** - Markdown-specific rules

## Default Ignores

The following patterns are ignored by default:

- `**/venv/**/*.*` - Python virtual environments
- `**/vitest.config.js` - Vitest configuration files
- `tmp.*`, `**/tmp`, `*.tmp` - Temporary files
- `package-lock.json` - NPM lock files
- `**/node_modules` - Dependencies
- `**/dist`, `**/coverage` - Build and test artifacts

## Testing

The package includes a comprehensive test suite that validates:

- ✅ **Success cases**: Files that should pass linting
- ❌ **Failure cases**: Files that should fail linting
- 🔧 **Rule application**: Correct rule application per file type

Run tests:

```bash
npm test
```

## Prettier Integration

This configuration includes seamless Prettier integration:

- **Conflict resolution**: ESLint rules that conflict with Prettier are disabled
- **Format on lint**: Code is automatically formatted during linting
- **Consistent style**: Ensures formatting matches linting expectations

Prettier settings:

- Print width: 120 characters
- Tab width: 2 spaces
- Semicolons: Always
- Single quotes: Yes (except JSON)
- Trailing commas: Always (multiline)
- Bracket spacing: Yes

## TypeScript Configuration

Advanced TypeScript support includes:

- **Type-aware linting**: Rules that understand TypeScript types
- **Import validation**: Ensures imports exist and are typed correctly
- **Practical defaults**: Disables overly strict rules for development productivity
- **Test file exceptions**: Relaxed rules for test files

### Key TypeScript Rules

- `@typescript-eslint/ban-ts-comment`: Disabled for flexibility
- `@typescript-eslint/no-unused-expressions`: Allows short-circuit and ternary
- Type-aware import/export validation
- Consistent naming conventions

## Node.js Integration

Special Node.js features:

- **Protocol imports**: Enforces `node:` prefix for built-ins (`node:fs`, `node:path`)
- **Global variables**: Includes Node.js globals
- **Import ordering**: Node.js built-ins first, then external, then internal

## Performance Considerations

- **Modular loading**: Only loads rules for relevant file types
- **Efficient parsing**: Optimized parsers for each file type
- **Selective application**: Rules only apply to matching file patterns
- **Conflict avoidance**: Prettier integration prevents redundant rule processing

## Common Use Cases

### New Project Setup

```javascript
// eslint.config.mjs
import templEslintConfig from "@templ-project/eslint";

export default templEslintConfig;
```

### Existing Project Migration

```javascript
// eslint.config.mjs
import templEslintConfig from "@templ-project/eslint";

export default [
  ...templEslintConfig,
  {
    // Gradually adopt stricter rules
    rules: {
      "no-console": "warn", // Start with warnings
    },
  },
];
```

### Monorepo Configuration

```javascript
// eslint.config.mjs
import templEslintConfig from "@templ-project/eslint";

export default [
  {
    ignores: ["packages/*/dist/**", "apps/*/build/**"],
  },
  ...templEslintConfig,
  {
    files: ["packages/shared/**"],
    rules: {
      // Stricter rules for shared packages
      "no-console": "error",
    },
  },
];
```

## Troubleshooting

### Common Issues

**Import resolution errors**: Ensure your `tsconfig.json` paths are correctly configured

**Prettier conflicts**: This package handles Prettier integration automatically

**Performance**: For large projects, consider using `.eslintignore` for additional exclusions

**TypeScript errors**: Ensure your TypeScript configuration is valid

### Debug Mode

Run ESLint with debug information:

```bash
DEBUG=eslint:* npx eslint .
```

## Contributing

This package is part of the Templ Project ecosystem. See the main repository for contribution guidelines.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and changes.

## License

MIT © Templ Project / Dragos Cirjan
