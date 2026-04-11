import json from '@eslint/json';
import jsonc from 'eslint-plugin-jsonc';

/**
 * Create JSON configuration
 * @param {import('../types.js').RuleSetOptions} [options={}] - Configuration options
 * @returns {import('eslint').Linter.Config[]} ESLint configuration array
 */
export function createJsonConfig(options = {}) {
  const { rules: customRules = {}, plugins: customPlugins = {}, languageOptions: customLanguageOptions = {} } = options;

  return [
    {
      plugins: {
        json,
        jsonc,
        ...customPlugins,
      },
      languageOptions: {
        ...customLanguageOptions,
      },
    },
    {
      name: 'templ:json/ignores',
      ignores: [
        'package-lock.json',
        '**/package-lock.json',
        '.nyc_output',
        '**/.nyc_output',
        '**/coverage',
        'coverage',
        '**/dist',
      ],
    },
    {
      name: 'templ:json',
      files: ['*.json', '**/*.json'],
      language: 'json/json',
      rules: {
        'no-irregular-whitespace': 'off', // Disable the problematic rule
        ...customRules,
      },
    },
    {
      name: 'templ:jsonc/overrides',
      files: [
        '*.jsonc',
        '**/*.jsonc',
        '**/tsconfig*.json', //
      ],
      language: 'json/jsonc',
      rules: {
        'no-irregular-whitespace': 'off', // Disable the problematic rule
        ...customRules,
      },
    },
    {
      name: 'templ:json5/overrides',
      files: ['*.json5', '**/*.json5'],
      language: 'json/json5',
      rules: {
        'no-irregular-whitespace': 'off', // Disable the problematic rule
        quotes: ['error', 'single', { avoidEscape: true }],
        ...customRules,
      },
    },
  ];
}

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    plugins: {
      json,
      jsonc,
    },
  },
  {
    name: 'templ:json/ignores',
    ignores: [
      'package-lock.json',
      '**/package-lock.json',
      '.nyc_output',
      '**/.nyc_output',
      '**/coverage',
      'coverage',
      '**/dist',
    ],
  },
  {
    name: 'templ:json/overrides',
    files: ['*.json', '**/*.json'],
    language: 'json/json',
    rules: {
      'no-irregular-whitespace': 'off', // Disable the problematic rule
    },
  },
  {
    name: 'templ:jsonc/overrides',
    files: [
      '*.jsonc',
      '**/*.jsonc',
      '**/tsconfig*.json', //
    ],
    language: 'json/jsonc',
    rules: {
      'no-irregular-whitespace': 'off', // Disable the problematic rule
    },
  },
  {
    name: 'templ:json5/overrides',
    files: ['*.json5', '**/*.json5'],
    language: 'json/json5',
    rules: {
      'no-irregular-whitespace': 'off', // Disable the problematic rule
      quotes: ['error', 'single', { avoidEscape: true }],
    },
  },
];
