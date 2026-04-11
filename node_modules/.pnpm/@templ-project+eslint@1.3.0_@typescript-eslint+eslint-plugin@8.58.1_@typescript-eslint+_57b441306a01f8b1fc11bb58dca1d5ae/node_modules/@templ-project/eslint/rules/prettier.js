import prettierConfig from 'eslint-config-prettier';
import prettier from 'eslint-plugin-prettier';

/**
 * Create Prettier configuration
 * @param {import('../types.js').RuleSetOptions} [options={}] - Configuration options
 * @returns {import('eslint').Linter.Config[]} ESLint configuration array
 */
export function createPrettierConfig(options = {}) {
  const { rules: customRules = {}, plugins: customPlugins = {}, languageOptions: customLanguageOptions = {} } = options;

  return [
    {
      name: 'templ:prettier',
      files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
      plugins: {
        prettier,
        ...customPlugins,
      },
      // ESLint rules
      rules: {
        // Enforce single quotes except in JSON/JSON5
        quotes: ['error', 'single', { avoidEscape: true }],
        // Enforce the use of semicolons
        semi: ['error', 'always'],
        // Enforce trailing commas where possible
        'comma-dangle': ['error', 'always-multiline'],
        // Enforce a maximum line length
        'max-len': ['error', { code: 120 }],
        // Enforce consistent indentation
        indent: ['error', 2],
        // specify curly brace conventions for all control statements
        // https://eslint.org/docs/rules/curly
        curly: ['error', 'multi-line'], // multiline
        // Prettier integration
        ...prettierConfig.rules,
        'prettier/prettier': [
          'error',
          {
            printWidth: 120,
            tabWidth: 2,
            semi: true,
            singleQuote: true,
            trailingComma: 'all',
            bracketSpacing: true,
          },
        ],
        // Disallow unnecessary spaces inside object literals
        'object-curly-spacing': ['error', 'always'],

        // Merge custom rules
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
  {
    name: 'templ:prettier',
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    plugins: {
      prettier,
    },
    // ESLint rules
    rules: {
      // Enforce single quotes except in JSON/JSON5
      quotes: ['error', 'single', { avoidEscape: true }],
      // Enforce the use of semicolons
      semi: ['error', 'always'],
      // Enforce trailing commas where possible
      'comma-dangle': ['error', 'always-multiline'],
      // Enforce a maximum line length
      'max-len': ['error', { code: 120 }],
      // Enforce consistent indentation
      indent: ['error', 2],
      // specify curly brace conventions for all control statements
      // https://eslint.org/docs/rules/curly
      curly: ['error', 'multi-line'], // multiline
      // Prettier integration
      ...prettierConfig.rules,
      'prettier/prettier': [
        'error',
        {
          printWidth: 120,
          tabWidth: 2,
          semi: true,
          singleQuote: true,
          trailingComma: 'all',
          bracketSpacing: true,
        },
      ],
      // Disallow unnecessary spaces inside object literals
      'object-curly-spacing': ['error', 'always'],
    },
  },
];
