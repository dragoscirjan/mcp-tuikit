# @templ-project/commitlint

A zero-configuration commitlint setup that extends `@commitlint/config-conventional` with a flexible configuration factory. This package provides an easy way to enforce [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) in your JavaScript and TypeScript projects.

## Features

- **Zero Configuration**: Works out of the box with sensible defaults
- **Flexible Factory**: Configuration function accepts custom options
- **Conventional Commits**: Built on `@commitlint/config-conventional`
- **Dual Module Support**: ESM and CommonJS compatible

## Installation

```bash
npm install --save-dev @templ-project/commitlint
```

## Usage

### Basic Usage

```javascript
// commitlint.config.js
import commitlintConfig from '@templ-project/commitlint';

export default commitlintConfig();
```

### With Custom Options

```javascript
// commitlint.config.js
import commitlintConfig from '@templ-project/commitlint';

export default commitlintConfig({
  rules: {
    'header-max-length': [2, 'always', 72],
    'scope-empty': [2, 'never']
  },
  ignores: [
    (commit) => commit.includes('[skip ci]')
  ]
});
```

### CommonJS

```javascript
// commitlint.config.js
const commitlintConfig = require('@templ-project/commitlint');

module.exports = commitlintConfig();
```

## Configuration

The configuration factory merges your options with the base `@commitlint/config-conventional` configuration:

```javascript
export default (options = {}) => ({
  extends: ['@commitlint/config-conventional'],
  ...options,
});
```

For detailed rule configuration and usage, see the [commitlint documentation](https://commitlint.js.org/).

## Git Hooks Setup

Install with Husky for automatic commit message validation:

```bash
npm install --save-dev husky
echo 'npx commitlint --edit $1' > .husky/commit-msg
chmod +x .husky/commit-msg
```

## Testing

The package includes comprehensive tests validating configuration factory behavior:

```bash
npm test
```

## Documentation

- [Conventional Commits Specification](https://www.conventionalcommits.org/en/v1.0.0/)
- [Commitlint Documentation](https://commitlint.js.org/)
- [Commitlint Rules Reference](https://commitlint.js.org/#/reference-rules)

## License

MIT © Dragos Cirjan
