const fs = require('node:fs');

const nodeVersion = 'node22';

const tsconfig = {
  base: {
    extends: `@tsconfig/${nodeVersion}/tsconfig.json`,
    include: [
      /* what files in the rootDir participate in the type-check */
      '${configDir}/src/**/*.ts',
    ],
    exclude: [],
    compilerOptions: {
      // ...baseConfig.compilerOptions,
      types: ['node'],

      // Best practices
      declaration: false,
      declarationMap: false,
      sourceMap: true,
      forceConsistentCasingInFileNames: true,
      removeComments: true,
      verbatimModuleSyntax: false,

      // Some stricter flags
      noUnusedLocals: true,
      noUnusedParameters: true,

      rootDir: '${configDir}/src',
      outDir: '${configDir}/dist',
    },
  },
  browser: {
    extends: './base.json',
    compilerOptions: {
      target: 'ES2020',
      module: 'ES2020',
      moduleResolution: 'bundler',
    },
  },
  cjs: {
    extends: './base.json',
    compilerOptions: {
      module: 'Node16',
      moduleResolution: 'Node16',
    },
  },
  esm: {
    extends: './base.json',
    compilerOptions: {
      module: 'ESNext',
      moduleResolution: 'Node',
    },
  },
  vitest: {
    extends: './cjs.json',
    compilerOptions: {
      types: ['node', 'vitest/globals'],
    },
  },
};

Object.entries(tsconfig).forEach(([key, config]) => fs.writeFileSync(`${key}.json`, JSON.stringify(config, null, 2)));
