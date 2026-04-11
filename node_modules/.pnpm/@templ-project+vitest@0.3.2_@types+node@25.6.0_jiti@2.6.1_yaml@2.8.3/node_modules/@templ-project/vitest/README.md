# @templ-project/vitest

A flexible, opinionated Vitest configuration factory designed for JavaScript and TypeScript projects. This package provides a portable testing configuration that works out of the box with sensible defaults while allowing easy customization and extension for specific project needs.

- [@templ-project/vitest](#templ-projectvitest)
  - [Features](#features)
  - [Installation](#installation)
  - [Module Compatibility](#module-compatibility)
  - [Usage](#usage)
    - [Basic Usage](#basic-usage)
    - [Custom Configuration](#custom-configuration)
    - [Advanced Customization](#advanced-customization)
  - [Default Configuration](#default-configuration)
    - [Test File Patterns](#test-file-patterns)
    - [Coverage Settings](#coverage-settings)
    - [Reporter Configuration](#reporter-configuration)
  - [Configuration Options](#configuration-options)
    - [Core Settings](#core-settings)
    - [File Inclusion Patterns](#file-inclusion-patterns)
    - [Coverage Configuration](#coverage-configuration)
    - [Reporter Options](#reporter-options)
  - [Integration](#integration)
    - [TypeScript Integration](#typescript-integration)
    - [ESLint Integration](#eslint-integration)
    - [CI/CD Integration](#cicd-integration)
  - [Common Use Cases](#common-use-cases)
    - [Standard Unit Testing](#standard-unit-testing)
    - [E2E Testing Setup](#e2e-testing-setup)
    - [Monorepo Testing](#monorepo-testing)
    - [Custom Test Patterns](#custom-test-patterns)
    - [Coverage Reporting](#coverage-reporting)
  - [Testing Patterns](#testing-patterns)
    - [Recommended File Structure](#recommended-file-structure)
    - [Naming Conventions](#naming-conventions)
  - [API Reference](#api-reference)
    - [Configuration Factory](#configuration-factory)
    - [Default Values](#default-values)
  - [Build and Development](#build-and-development)
    - [Build Process](#build-process)
    - [Development Workflow](#development-workflow)
  - [Testing](#testing)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
    - [Performance Optimization](#performance-optimization)
  - [Contributing](#contributing)
  - [Changelog](#changelog)
  - [License](#license)

## Features

- **Zero-config setup**: Works out of the box with intelligent defaults
- **Flexible configuration**: Easy to customize and extend via configuration factory
- **Multi-language support**: JavaScript and TypeScript test files
- **Comprehensive coverage**: Built-in coverage reporting with sensible exclusions
- **Multiple test types**: Unit tests, integration tests, and E2E tests
- **Verbose reporting**: Detailed test output by default
- **Global test utilities**: Vitest globals enabled for convenient testing
- **TypeScript integration**: Built with TypeScript, works seamlessly with TS projects

## Installation

```bash
npm install --save-dev @templ-project/vitest
```

This package includes Vitest as a dependency, so you don't need to install it separately.

## Module Compatibility

This package is **ESM-only** and requires projects to use ES modules for the Vitest configuration. However, your actual test files can be in any module format supported by Vitest.

**Configuration file**: Must use `.js` or `.mjs` extension with ES module syntax.

## Usage

### Basic Usage

Create a `vitest.config.js` file in your project root:

```javascript
import { defineConfig } from "@templ-project/vitest";

export default defineConfig();
```

This provides a complete Vitest configuration with sensible defaults for most projects.

### Custom Configuration

Override specific settings while keeping the defaults:

```javascript
import { defineConfig } from "@templ-project/vitest";

export default defineConfig({
  // Custom test file patterns
  include: ["src/**/*.{test,spec}.{js,ts}"],

  // Custom coverage settings
  coverage: {
    threshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    exclude: ["src/legacy/**/*"],
  },

  // Custom reporter
  reporters: ["default", "junit"],
});
```

### Advanced Customization

Pass any Vitest configuration options:

```javascript
import { defineConfig } from "@templ-project/vitest";

export default defineConfig({
  // Custom environment
  environment: "jsdom",

  // Setup files
  setupFiles: ["./test/setup.ts"],

  // Custom test timeout
  testTimeout: 10000,

  // Mock configuration
  server: {
    deps: {
      inline: ["my-inline-dep"],
    },
  },

  // Custom include patterns
  include: [
    "src/**/*.{test,spec}.{js,ts,jsx,tsx}",
    "test/**/*.{test,spec}.{js,ts,jsx,tsx}",
  ],
});
```

## Default Configuration

### Test File Patterns

The configuration automatically includes the following test file patterns:

```javascript
// Default patterns for JavaScript and TypeScript
[
  "src/**/*.spec.js",
  "test/**/*.test.js",
  "test/**/*.e2e.js",
  "src/**/*.spec.ts",
  "test/**/*.test.ts",
  "test/**/*.e2e.ts",
];
```

### Coverage Settings

Default coverage configuration:

```javascript
{
  {
    [
      // Vitest defaults plus custom exclusions
      ...configDefaults.exclude,
      "src/test/**/*", // Internal test utilities
    ];
  }
}
```

### Reporter Configuration

- **Default reporter**: `verbose` for detailed test output
- **Globals enabled**: Test utilities (`describe`, `it`, `expect`) available globally
- **Coverage**: Enabled with sensible exclusions

## Configuration Options

### Core Settings

| Option             | Default                  | Description                  |
| ------------------ | ------------------------ | ---------------------------- |
| `globals`          | `true`                   | Enable global test utilities |
| `include`          | See patterns above       | Test file inclusion patterns |
| `reporters`        | `['verbose']`            | Test output reporters        |
| `coverage.exclude` | Vitest defaults + custom | Files excluded from coverage |

### File Inclusion Patterns

You can customize which files are considered test files:

```javascript
export default defineConfig({
  // Include test patterns
  include: [
    "src/**/*.{test,spec}.{js,ts}",
    "tests/**/*.{js,ts}",
    "**/__tests__/**/*.{js,ts}",
  ],
});
```

### Coverage Configuration

Customize coverage reporting:

```javascript
export default defineConfig({
  coverage: {
    // Coverage thresholds
    threshold: {
      global: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },

    // Additional exclusions
    exclude: ["src/types/**/*", "src/constants/**/*", "**/*.d.ts"],

    // Coverage reporters
    reporter: ["text", "html", "lcov"],
  },
});
```

### Reporter Options

Configure test output reporting:

```javascript
export default defineConfig({
  // Multiple reporters
  reporters: ["default", "junit", "json"],

  // Custom reporter configuration
  outputFile: {
    junit: "./test-results/junit.xml",
    json: "./test-results/results.json",
  },
});
```

## Integration

### TypeScript Integration

The package works seamlessly with TypeScript projects. Ensure your `tsconfig.json` includes test files:

```json
{
  "extends": "@templ-project/tsconfig/vitest.json",
  "include": ["src/**/*", "test/**/*", "**/*.test.ts", "**/*.spec.ts"]
}
```

### ESLint Integration

When using `@templ-project/eslint`, test-specific rules are automatically applied to test files matching the patterns defined in this configuration.

### CI/CD Integration

The configuration works well in CI environments:

```yaml
# GitHub Actions example
- name: Run tests
  run: npm test

- name: Run tests with coverage
  run: npm test -- --coverage
```

## Common Use Cases

### Standard Unit Testing

```javascript
// vitest.config.js
import { defineConfig } from "@templ-project/vitest";

export default defineConfig(); // Uses all defaults
```

### E2E Testing Setup

```javascript
// vitest.config.e2e.js
import { defineConfig } from "@templ-project/vitest";

export default defineConfig({
  include: ["test/**/*.e2e.{js,ts}"],
  testTimeout: 30000,
  setupFiles: ["./test/e2e-setup.ts"],
});
```

### Monorepo Testing

```javascript
// packages/shared/vitest.config.js
import { defineConfig } from "@templ-project/vitest";

export default defineConfig({
  include: ["src/**/*.{test,spec}.{js,ts}"],
  coverage: {
    exclude: ["src/test-utils/**/*"],
  },
});
```

### Custom Test Patterns

```javascript
// vitest.config.js
import { defineConfig } from "@templ-project/vitest";

export default defineConfig({
  include: [
    "src/**/__tests__/**/*.{js,ts}",
    "src/**/*.{test,spec}.{js,ts}",
    "integration/**/*.test.{js,ts}",
  ],
});
```

### Coverage Reporting

```javascript
// vitest.config.js
import { defineConfig } from "@templ-project/vitest";

export default defineConfig({
  coverage: {
    reporter: ["text", "html", "lcov"],
    threshold: {
      global: {
        branches: 85,
        functions: 85,
        lines: 85,
        statements: 85,
      },
    },
    exclude: ["src/types/**/*", "src/mocks/**/*", "**/*.config.{js,ts}"],
  },
});
```

## Testing Patterns

### Recommended File Structure

```
project/
├── src/
│   ├── components/
│   │   ├── Button.ts
│   │   └── Button.spec.ts     # Unit tests
│   └── utils/
│       ├── helpers.ts
│       └── helpers.test.ts    # Unit tests
├── test/
│   ├── fixtures/              # Test data
│   ├── setup.ts              # Test setup
│   ├── integration/
│   │   └── api.test.ts       # Integration tests
│   └── e2e/
│       └── user-flow.e2e.ts  # E2E tests
└── vitest.config.js
```

### Naming Conventions

The configuration supports these naming patterns:

- **Unit tests**: `*.test.{js,ts}` or `*.spec.{js,ts}`
- **Integration tests**: `*.test.{js,ts}` in `test/` directory
- **E2E tests**: `*.e2e.{js,ts}`

## API Reference

### Configuration Factory

```text
function defineConfig(options?: VitestOptions): VitestConfig;
```

The main export is a configuration factory that accepts Vitest options and returns a complete Vitest configuration.

### Default Values

```json
{
  "include": [
    "src/**/*.spec.js", "test/**/*.test.js", "test/**/*.e2e.js",
    "src/**/*.spec.ts", "test/**/*.test.ts", "test/**/*.e2e.ts"
  ],
  "reporters": ["verbose"],
  "coverage": {
    "exclude": ["src/test/**/*"]
  },
  "globals": true
}
```

## Build and Development

### Build Process

The package is written in TypeScript and compiled to JavaScript:

```bash
# Build the package
npm run build

# Watch for changes during development
npm run test:watch
```

### Development Workflow

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build and test
npm run prebuild && npm test
```

## Testing

The package includes comprehensive tests that validate:

- ✅ **Default configuration**: Ensures sensible defaults are applied
- ✅ **Custom overrides**: Validates that custom options override defaults correctly
- ✅ **Configuration factory**: Tests the factory function behavior
- 🧪 **Integration**: Validates integration with Vitest runtime

Run tests:

```bash
npm test
```

## Troubleshooting

### Common Issues

**Configuration not found**: Ensure you're using ES module syntax in your config file:

```javascript
// ✅ Correct
import { defineConfig } from "@templ-project/vitest";
export default defineConfig();
```

```javascript
// ❌ Incorrect (CommonJS)
const { defineConfig } = require("@templ-project/vitest");
module.exports = defineConfig();
```

**Test files not found**: Check that your test files match the default patterns or customize the `include` option.

**TypeScript errors**: Ensure your `tsconfig.json` includes test files and extends the appropriate Templ Project configuration.

**Coverage issues**: Verify that your source files are not excluded by the coverage configuration.

### Performance Optimization

For large projects, consider:

```javascript
export default defineConfig({
  // Reduce file watching
  include: ["src/**/*.test.{js,ts}"], // More specific patterns

  // Optimize coverage
  coverage: {
    exclude: ["src/test/**/*", "**/*.config.{js,ts}", "src/types/**/*"],
  },

  // Faster test execution
  pool: "threads",
  poolOptions: {
    threads: {
      singleThread: true,
    },
  },
});
```

## Contributing

This package is part of the Templ Project ecosystem. See the main repository for contribution guidelines.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and changes.

## License

MIT © Dragos Cirjan
