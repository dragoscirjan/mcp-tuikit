import templEslintConfig from '@templ-project/eslint';

export default [
  {
    ignores: ['.jscpd/**', '.specs/**', '.ai.tmp/**', 'site/**', '.venv/**'],
  },
  ...templEslintConfig,
  {
    rules: {
      'yml/no-empty-mapping-value': 'off',
    },
  },
  {
    files: ['**/*.md/*.yaml', '**/*.md/*.yml'],
    rules: {
      'yml/quotes': ['error', { prefer: 'double', avoidEscape: true }],
    },
  },
];
