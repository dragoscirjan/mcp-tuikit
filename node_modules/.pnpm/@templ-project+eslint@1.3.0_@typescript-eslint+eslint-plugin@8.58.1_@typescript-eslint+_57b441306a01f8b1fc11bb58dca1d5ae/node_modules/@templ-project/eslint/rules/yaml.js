import yaml from 'eslint-plugin-yml';

/**
 * Create YAML configuration
 * @param {import('../types.js').RuleSetOptions} [options={}] - Configuration options
 * @returns {import('eslint').Linter.Config[]} ESLint configuration array
 */
export function createYamlConfig(options = {}) {
  const { rules: customRules = {}, plugins: customPlugins = {}, languageOptions: customLanguageOptions = {} } = options;

  return [
    ...yaml.configs['flat/recommended'],
    {
      name: 'templ:yaml',
      files: ['*.yaml', '**/*.yaml', '*.yml', '**/*.yml'],
      plugins: {
        ...customPlugins,
      },
      rules: {
        indent: ['error', 2],
        'yml/quotes': ['error', { prefer: 'single', avoidEscape: true }],
        'yml/no-empty-document': 'error',
        ...customRules,
      },
      languageOptions: {
        ...customLanguageOptions,
      },
    },
  ];
}

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...yaml.configs['flat/recommended'],
  {
    name: 'templ:yml/overrides',
    files: ['*.yaml', '**/*.yaml', '*.yml', '**/*.yml'],
    rules: {
      indent: ['error', 2],
      'yml/quotes': ['error', { prefer: 'single', avoidEscape: true }],
      'yml/no-empty-document': 'error',
    },
  },
];
