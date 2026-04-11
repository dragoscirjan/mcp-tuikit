/**
 * Create text file configuration
 * @param {import('../types.js').RuleSetOptions} [options={}] - Configuration options
 * @returns {import('eslint').Linter.Config[]} ESLint configuration array
 */
export function createTextConfig(options = {}) {
  const { rules: customRules = {}, plugins: customPlugins = {}, languageOptions: customLanguageOptions = {} } = options;

  return [
    {
      name: 'templ:text',
      files: ['**/*.txt'], // Apply only to .txt files
      plugins: {
        ...customPlugins,
      },
      languageOptions: {
        parser: {
          parse: (txt) => {
            const lines = txt.split('\n');
            return {
              type: 'Program',
              sourceType: 'module',
              comments: [],
              tokens: [],
              body: [],
              range: [0, txt.length],
              loc: {
                start: {
                  line: 1,
                  column: 0,
                },
                end: {
                  line: lines.length,
                  column: lines[lines.length - 1].length,
                },
              },
            };
          },
        },
        ...customLanguageOptions,
      },
      rules: {
        'eol-last': ['error', 'always'],
        ...customRules,
      },
    },
    {
      name: 'templ:all-other-text-files--eol-last',
      files: ['**/*.json', '**/*.jsonc', '**/*.md', '**/*.yml', '**/*.yaml'],
      rules: {
        'eol-last': ['error', 'always'],
        ...customRules,
      },
    },
  ];
}

export default [
  {
    name: 'templ:*.txt--eol-last',
    files: ['**/*.txt'], // Apply only to .txt files
    languageOptions: {
      parser: {
        parse: (txt) => {
          const lines = txt.split('\n');
          return {
            type: 'Program',
            sourceType: 'module',
            comments: [],
            tokens: [],
            body: [],
            range: [0, txt.length],
            loc: {
              start: {
                line: 1,
                column: 0,
              },
              end: {
                line: lines.length,
                column: lines[lines.length - 1].length,
              },
            },
          };
        },
      },
    },
    rules: {
      'eol-last': ['error', 'always'],
    },
  },
  {
    name: 'cblt:all-other-text-files--eol-last',
    files: ['**/*.json', '**/*.jsonc', '**/*.md', '**/*.yml', '**/*.yaml'],
    rules: {
      'eol-last': ['error', 'always'],
    },
  },
];
