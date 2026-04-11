import markdown from 'eslint-plugin-markdown';

/**
 * Create Markdown configuration
 * @param {import('../types.js').RuleSetOptions} [options={}] - Configuration options
 * @returns {import('eslint').Linter.Config[]} ESLint configuration array
 */
export function createMarkdownConfig(options = {}) {
  const { rules: customRules = {}, plugins: customPlugins = {}, languageOptions: customLanguageOptions = {} } = options;

  return markdown.configs.recommended.concat([
    {
      name: 'templ:markdown',
      files: ['**/*.md/*.js'],
      plugins: {
        ...customPlugins,
      },
      rules: {
        'no-console': 'off',
        'import/no-unresolved': 'off',
        'require-await': 'off',
        'no-unreachable': 'off',
        ...customRules,
      },
      languageOptions: {
        ...customLanguageOptions,
      },
    },
  ]);
}

/** @type {const('eslint').Linter.Config[]} */
export default markdown.configs.recommended.concat([
  {
    name: 'templ:markdown/code-blocks/js',
    files: ['**/*.md/*.js'],
    rules: {
      'no-console': 'off',
      'import/no-unresolved': 'off',
      'require-await': 'off',
      'no-unreachable': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-redeclare': 'off',
    },
  },
  {
    name: 'templ:markdown/code-blocks/ts',
    files: ['**/*.md/*.ts'],
    rules: {
      'no-console': 'off',
      'import/no-unresolved': 'off',
      'require-await': 'off',
      'no-unreachable': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'off',
    },
  },
  {
    name: 'templ:markdown/code-blocks/json',
    files: ['**/*.md/*.json'],
    rules: {
      'no-dupe-keys': 'off',
    },
  },
]);
