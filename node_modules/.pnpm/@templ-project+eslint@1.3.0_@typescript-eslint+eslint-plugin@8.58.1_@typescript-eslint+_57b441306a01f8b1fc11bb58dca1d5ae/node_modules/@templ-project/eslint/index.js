import { createJsAndTsConfig as _createJsAndTsConfig } from './rules/js-and-ts.js';
import { createJsonConfig as _createJsonConfig } from './rules/json.js';
import { createMarkdownConfig as _createMarkdownConfig } from './rules/markdown.js';
import { createPrettierConfig as _createPrettierConfig } from './rules/prettier.js';
import { createTextConfig as _createTextConfig } from './rules/text.js';
import { createTomlConfig as _createTomlConfig } from './rules/toml.js';
import { createYamlConfig as _createYamlConfig } from './rules/yaml.js';

/**
 * Default ignore patterns
 */
const DEFAULT_IGNORES = ['**/venv/**/*.*', '**/vitest.config.js', 'tmp.*', '**/tmp', '*.tmp'];

/**
 * Create ESLint configuration with customizable options
 * @param {import('./types.js').EslintConfigOptions} [options={}] - Configuration options
 * @returns {import('eslint').Linter.Config[]} ESLint configuration array
 */
export function createEslintConfig(options = {}) {
  const {
    enableTypeScript = true,
    enablePrettier = true,
    enableYaml = true,
    enableToml = true,
    enableJson = true,
    enableMarkdown = true,
    enableText = true,
    enableVitest = true,
    ignores = DEFAULT_IGNORES,
    rules = {},
    plugins = {},
    languageOptions = {},
  } = options;

  const configs = [];

  // Add ignore configuration if patterns are provided
  // Check if ignores was explicitly set (including empty array) vs using default
  const hasIgnores = 'ignores' in options ? options.ignores.length > 0 : ignores.length > 0;
  if (hasIgnores) {
    configs.push({
      ignores: 'ignores' in options ? options.ignores : ignores,
    });
  }

  // Add rule configurations based on feature toggles
  // Always include JavaScript rules, conditionally include TypeScript
  configs.push(
    ...createJsAndTsConfig({
      rules: rules.typescript || rules,
      plugins,
      languageOptions,
      enableVitest,
      enableTypeScript,
    }),
  );

  if (enablePrettier) {
    configs.push(
      ...createPrettierConfig({
        rules: rules.prettier || {},
        plugins,
        languageOptions,
      }),
    );
  }

  if (enableYaml) {
    configs.push(
      ...createYamlConfig({
        rules: rules.yaml || {},
        plugins,
        languageOptions,
      }),
    );
  }

  if (enableToml) {
    configs.push(
      ...createTomlConfig({
        rules: rules.toml || {},
        plugins,
        languageOptions,
      }),
    );
  }

  if (enableJson) {
    configs.push(
      ...createJsonConfig({
        rules: rules.json || {},
        plugins,
        languageOptions,
      }),
    );
  }

  if (enableText) {
    configs.push(
      ...createTextConfig({
        rules: rules.text || {},
        plugins,
        languageOptions,
      }),
    );
  }

  if (enableMarkdown) {
    configs.push(
      ...createMarkdownConfig({
        rules: rules.markdown || {},
        plugins,
        languageOptions,
      }),
    );
  }

  return configs;
}

// Named exports for individual rule set functions
export const createJsAndTsConfig = _createJsAndTsConfig;
export const createPrettierConfig = _createPrettierConfig;
export const createYamlConfig = _createYamlConfig;
export const createTomlConfig = _createTomlConfig;
export const createJsonConfig = _createJsonConfig;
export const createMarkdownConfig = _createMarkdownConfig;
export const createTextConfig = _createTextConfig;

// Default export for backward compatibility - return the default configuration
/** @type {import('eslint').Linter.Config[]} */
export default createEslintConfig();
