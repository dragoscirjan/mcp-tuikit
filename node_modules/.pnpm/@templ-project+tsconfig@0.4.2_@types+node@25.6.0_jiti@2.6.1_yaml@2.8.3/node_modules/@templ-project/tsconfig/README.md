# @templ-project/tsconfig

A comprehensive collection of TypeScript configurations designed for different runtime environments and build targets. This package provides portable, opinionated TSConfig presets that can be used as-is or extended for custom project needs.

- [@templ-project/tsconfig](#templ-projecttsconfig)
  - [Features](#features)
  - [Installation](#installation)
  - [Available Configurations](#available-configurations)
    - [base.json - Foundation Configuration](#basejson---foundation-configuration)
    - [browser.json - Browser/Frontend Projects](#browserjson---browserfrontend-projects)
    - [cjs.json - CommonJS/Node.js Projects](#cjsjson---commonjsnodejs-projects)
    - [esm.json - ES Modules Projects](#esmjson---es-modules-projects)
    - [vitest.json - Testing with Vitest](#vitestjson---testing-with-vitest)
  - [Usage](#usage)
    - [Basic Usage](#basic-usage)
    - [Extending Configurations](#extending-configurations)
    - [Custom Project Structure](#custom-project-structure)
  - [Configuration Details](#configuration-details)
    - [Base Configuration Features](#base-configuration-features)
    - [Environment-Specific Settings](#environment-specific-settings)
  - [Build System Integration](#build-system-integration)
    - [Dynamic Configuration Generation](#dynamic-configuration-generation)
    - [Automated Building](#automated-building)
  - [Testing](#testing)
    - [Compilation Testing](#compilation-testing)
    - [Output Validation](#output-validation)
  - [Common Use Cases](#common-use-cases)
    - [Node.js CLI Application](#nodejs-cli-application)
    - [Browser Library](#browser-library)
    - [Dual Package (ESM + CJS)](#dual-package-esm--cjs)
    - [Testing Setup](#testing-setup)
    - [Monorepo Configuration](#monorepo-configuration)
  - [Configuration Reference](#configuration-reference)
    - [Compiler Options](#compiler-options)
    - [Path Mapping](#path-mapping)
  - [Best Practices](#best-practices)
    - [Project Structure](#project-structure)
    - [Environment Selection](#environment-selection)
    - [Build Optimization](#build-optimization)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
    - [Module Resolution Problems](#module-resolution-problems)
  - [Contributing](#contributing)
  - [Changelog](#changelog)
  - [License](#license)

## Features

- **Multiple environments**: Browser, Node.js (CJS/ESM), and testing configurations
- **Modern TypeScript**: Based on `@tsconfig/node22` with latest TypeScript features
- **Opinionated defaults**: Production-ready settings with strict type checking
- **Flexible structure**: Configurable source and output directories
- **Testing integration**: Vitest-specific configuration with global types
- **Build automation**: Dynamic configuration generation via build script
- **Comprehensive validation**: Automated testing for all configuration variants

## Installation

```bash
npm install --save-dev @templ-project/tsconfig
```

This package includes TypeScript as a dependency, so you don't need to install it separately.

## Available Configurations

### base.json - Foundation Configuration

The foundation configuration that all other configs extend from.

**Features:**
- Extends `@tsconfig/node22` for modern Node.js compatibility
- Strict type checking with unused variable detection
- Source maps enabled for debugging
- Configurable source and output directories
- Comment removal for production builds

**Best for:** Starting point for any TypeScript project

### browser.json - Browser/Frontend Projects

Optimized for browser environments and frontend applications.

**Key Settings:**
- **Target:** ES2020 for modern browser support
- **Module:** ES2020 for native browser modules
- **Module Resolution:** Bundler-optimized for webpack/vite/rollup

**Best for:** React, Vue, Angular apps, browser libraries

### cjs.json - CommonJS/Node.js Projects

Configured for traditional Node.js projects using CommonJS modules.

**Key Settings:**
- **Module:** Node16 for CommonJS output
- **Module Resolution:** Node16 for Node.js module resolution

**Best for:** Node.js servers, CLI tools, legacy Node.js projects

### esm.json - ES Modules Projects

Configured for modern Node.js projects using ES modules.

**Key Settings:**
- **Module:** ESNext for cutting-edge module features
- **Module Resolution:** Node for Node.js compatibility

**Best for:** Modern Node.js applications, libraries, ESM-first projects

### vitest.json - Testing with Vitest

Specialized configuration for testing with Vitest framework.

**Key Settings:**
- Extends CJS configuration for Node.js test environment
- Includes Vitest global types (`vitest/globals`)
- Node.js types for test utilities

**Best for:** Unit tests, integration tests, test suites

## Usage

### Basic Usage

Choose the appropriate configuration for your project and extend it:

```json
{
  "extends": "@templ-project/tsconfig/browser.json",
  "compilerOptions": {
    "outDir": "./build"
  },
  "include": ["src/**/*"]
}
```

### Extending Configurations

You can extend any configuration with project-specific settings:

```json
{
  "extends": "@templ-project/tsconfig/base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"]
    },
    "lib": ["DOM", "ES2020"]
  },
  "include": [
    "src/**/*",
    "types/**/*"
  ],
  "exclude": [
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

### Custom Project Structure

The configurations use template variables that you can customize:

```json
{
  "extends": "@templ-project/tsconfig/esm.json",
  "compilerOptions": {
    "rootDir": "./source",
    "outDir": "./output",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["source/**/*.ts"]
}
```

## Configuration Details

### Base Configuration Features

All configurations inherit these foundational settings:

| Setting | Value | Purpose |
|---------|-------|---------|
| `target` | From @tsconfig/node22 | Modern JavaScript output |
| `sourceMap` | `true` | Enable debugging support |
| `removeComments` | `true` | Smaller output files |
| `forceConsistentCasingInFileNames` | `true` | Cross-platform compatibility |
| `noUnusedLocals` | `true` | Catch unused variables |
| `noUnusedParameters` | `true` | Catch unused parameters |
| `verbatimModuleSyntax` | `false` | Allow mixed import/export styles |

### Environment-Specific Settings

| Configuration | Module System | Target Environment | Module Resolution |
|---------------|---------------|-------------------|-------------------|
| **browser.json** | ES2020 | Modern browsers | bundler |
| **cjs.json** | Node16 | Node.js CommonJS | Node16 |
| **esm.json** | ESNext | Node.js ES Modules | Node |
| **vitest.json** | Node16 | Testing (Node.js) | Node16 |

## Build System Integration

### Dynamic Configuration Generation

The package includes a build system that generates configurations programmatically:

```javascript
// build.js
const nodeVersion = 'node22';

const tsconfig = {
  base: {
    extends: `@tsconfig/${nodeVersion}/tsconfig.json`,
    // ... configuration options
  },
  // ... other configurations
};
```

### Automated Building

```bash
# Regenerate all configuration files
npm run build

# Run tests with fresh configurations
npm run pretest
npm test
```

## Testing

### Compilation Testing

The package includes comprehensive tests that validate:

- ✅ **Compilation success**: All configurations compile without errors
- ✅ **Output format**: Correct module format (CJS/ESM) is generated
- ✅ **Type checking**: Strict type validation works correctly
- 🔧 **Environment compatibility**: Configurations work in target environments

### Output Validation

```typescript
// Example test validation
expect(output).toContain('export const hello'); // ESM output
expect(output).toContain('exports.hello = hello'); // CJS output
```

## Common Use Cases

### Node.js CLI Application

```json
{
  "extends": "@templ-project/tsconfig/cjs.json",
  "compilerOptions": {
    "outDir": "./dist",
    "declaration": false
  },
  "include": ["src/**/*"],
  "exclude": ["**/*.test.ts"]
}
```

### Browser Library

```json
{
  "extends": "@templ-project/tsconfig/browser.json",
  "compilerOptions": {
    "outDir": "./lib",
    "declaration": true,
    "declarationMap": true,
    "lib": ["DOM", "ES2020"]
  }
}
```

### Dual Package (ESM + CJS)

Create separate configurations for each output:

```jsonc
// tsconfig.esm.json
{
  "extends": "@templ-project/tsconfig/esm.json",
  "compilerOptions": {
    "outDir": "./dist/esm"
  }
}
```

```jsonc
// tsconfig.cjs.json
{
  "extends": "@templ-project/tsconfig/cjs.json",
  "compilerOptions": {
    "outDir": "./dist/cjs"
  }
}
```

### Testing Setup

```jsonc
// tsconfig.test.json
{
  "extends": "@templ-project/tsconfig/vitest.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": [
    "src/**/*",
    "test/**/*",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

### Monorepo Configuration

```jsonc
// packages/shared/tsconfig.json
{
  "extends": "@templ-project/tsconfig/base.json",
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

```jsonc
// packages/app/tsconfig.json
{
  "extends": "@templ-project/tsconfig/esm.json",
  "references": [
    { "path": "../shared" }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["../shared/src/*"]
    }
  }
}
```

## Configuration Reference

### Compiler Options

| Option | base.json | browser.json | cjs.json | esm.json | vitest.json |
|--------|-----------|--------------|----------|----------|-------------|
| `module` | From base | ES2020 | Node16 | ESNext | Node16 |
| `moduleResolution` | From base | bundler | Node16 | Node | Node16 |
| `target` | From @tsconfig/node22 | ES2020 | From base | From base | From base |
| `types` | `["node"]` | From base | From base | From base | `["node", "vitest/globals"]` |

### Path Mapping

All configurations support TypeScript path mapping:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["types/*"]
    }
  }
}
```

## Best Practices

### Project Structure

Recommended directory structure for optimal configuration usage:

```
project/
├── src/           # Source TypeScript files
├── dist/          # Compiled output
├── test/          # Test files
├── types/         # Type definitions
└── tsconfig.json  # Main TypeScript config
```

### Environment Selection

Choose the right configuration for your target environment:

- **Node.js applications**: Use `cjs.json` for compatibility or `esm.json` for modern projects
- **Browser libraries**: Use `browser.json` with bundler integration
- **Full-stack projects**: Consider separate configs for client/server code
- **Testing**: Always use `vitest.json` for test files

### Build Optimization

For production builds, consider these overrides:

```jsonc
{
  "extends": "@templ-project/tsconfig/base.json",
  "compilerOptions": {
    "sourceMap": false,      // Disable in production
    "removeComments": true,  // Already enabled
    "declaration": true,     // For libraries
    "declarationMap": true   // For better IDE support
  }
}
```

## Troubleshooting

### Common Issues

**Configuration not found**: Ensure the package is installed and the path is correct:
```bash
npm list @templ-project/tsconfig
```

**Module resolution errors**: Check that you're using the right configuration for your environment:
- Browser projects need `moduleResolution: "bundler"`
- Node.js projects need `moduleResolution: "Node16"`

**Type errors in tests**: Make sure you're extending `vitest.json` for test configurations.

### Module Resolution Problems

If you encounter module resolution issues:

1. **Check your package.json**: Ensure `type` field matches your chosen configuration
2. **Verify imports**: Use appropriate import syntax for your target environment
3. **Update dependencies**: Ensure TypeScript version compatibility

```jsonc
{
  "type": "module",  // For ESM projects
  "type": "commonjs" // For CJS projects (default)
}
```

## Contributing

This package is part of the Templ Project ecosystem. See the main repository for contribution guidelines.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and changes.

## License

MIT © Dragos Cirjan
