module.exports = {
  bracketSpacing: true,
  overrides: [
    {
      files: '*.json',
      options: {
        parser: 'json',
        singleQuote: false,
      },
    },
    {
      files: '*.json5',
      options: {
        parser: 'json5',
        singleQuote: false,
      },
    },
    {
      files: '*.jsonc',
      options: {
        parser: 'jsonc',
        singleQuote: false,
      },
    },
    {
      files: '*.js',
      options: {
        parser: 'babel',
      },
    },
    {
      files: '*.md',
      options: {
        parser: 'markdown',
        singleQuote: false,
        proseWrap: 'preserve',
      },
    },
    {
      files: ['*.yaml', '*.yml'],
      options: {
        parser: 'yaml',
        singleQuote: true,
        bracketSpacing: true,
      },
    },
    {
      files: ['*.toml'],
      options: {
        parser: 'toml',
        alignComments: false,
        alignEntries: false,
      },
    },
  ],
  parser: 'typescript',
  printWidth: 120,
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'all',
  plugins: ['prettier-plugin-toml'],
};
