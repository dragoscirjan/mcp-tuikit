import toml from 'eslint-plugin-toml';

/**
 * Create TOML configuration
 * @param {import('../types.js').RuleSetOptions} [options={}] - Configuration options
 * @returns {import('eslint').Linter.Config[]} ESLint configuration array
 */
export function createTomlConfig(options = {}) {
  const { rules: customRules = {}, plugins: customPlugins = {}, languageOptions: customLanguageOptions = {} } = options;

  return [
    ...toml.configs['flat/recommended'],
    {
      name: 'templ:toml',
      files: ['*.toml', '**/*.toml'],
      plugins: {
        ...customPlugins,
      },
      rules: {
        'toml/indent': ['error', 2],
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
  ...toml.configs['flat/recommended'],
  {
    name: 'templ:toml/overrides',
    files: ['*.toml', '**/*.toml'],
    rules: {
      'toml/indent': ['error', 2],
    },
  },
];
