import templEslintConfig from '@templ-project/eslint';

export default [
  {
    ignores: ['.jscpd/**', '.specs/**', '.ai.tmp/**'],
  },
  ...templEslintConfig,
];
