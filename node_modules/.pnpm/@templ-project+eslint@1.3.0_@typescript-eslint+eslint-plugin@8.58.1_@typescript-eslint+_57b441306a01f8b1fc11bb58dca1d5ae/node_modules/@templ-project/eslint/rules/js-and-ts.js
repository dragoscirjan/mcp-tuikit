import esConfigGlobal from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import imports from 'eslint-plugin-import';
import importNodeBuiltin from 'eslint-plugin-node-import';
import globals from 'globals';
import tsConfigGlobal from 'typescript-eslint';

/**
 * Note:
 * Do not change the order of the config keys as hey will behave differently
 */

/**
 * Create JavaScript and TypeScript configurations
 * @param {import('../types.js').RuleSetOptions & { enableVitest?: boolean, enableTypeScript?: boolean }} [options={}] - Configuration options
 * @returns {import('eslint').Linter.Config[]} ESLint configuration array
 */
export function createJsAndTsConfig(options = {}) {
  const {
    rules: customRules = {},
    plugins: customPlugins = {},
    languageOptions: customLanguageOptions = {},
    enableVitest = true,
    enableTypeScript = true,
  } = options;

  const esConfig = getEsConfig(esConfigGlobal, {
    customRules,
    customPlugins,
    customLanguageOptions,
  });
  const tsConfig = getTsConfig(esConfig, tsConfigGlobal, customRules);

  const configs = [
    {
      name: 'templ:global/node',
      files: ['**/*.{js,mjs,cjs,jsx}'],
      ...esConfig,
    },
  ];

  // Only add TypeScript config if enabled
  if (enableTypeScript) {
    configs.push({
      files: ['**/*.{ts,mts,cts,tsx}'],
      ...tsConfig,
      name: 'templ:global/ts',
    });
  }

  if (enableVitest) {
    configs.push({
      name: 'templ:globals/tests',
      files: ['**/*.{e2e,test,spec}.{js,cjs,mjs,ts,cts,mts}'],
      ...vitest.configs.recommended,
      languageOptions: {
        globals: {
          ...vitest.environments.env.globals,
        },
      },
    });
  }

  return configs;
}

// Export default for backward compatibility
const esConfig = getEsConfig(esConfigGlobal);
const tsConfig = getTsConfig(esConfig, tsConfigGlobal);

export default [
  {
    name: 'templ:global/node',
    files: ['**/*.{js,mjs,cjs,jsx}'],
    ...esConfig,
  },
  {
    files: ['**/*.{ts,mts,cts,tsx}'],
    ...tsConfig,
    name: 'templ:global/ts',
  },
  {
    name: 'templ:globals/tests',
    files: ['**/*.{e2e,test,spec}.{js,cjs,mjs,ts,cts,mts}'],
    ...vitest.configs.recommended,
    languageOptions: {
      globals: {
        ...vitest.environments.env.globals,
      },
    },
  },
];

function getEsConfig(esConfigGlobal, options = {}) {
  const { customRules = {}, customPlugins = {}, customLanguageOptions = {} } = options;
  return {
    plugins: {
      imports,
      'node-import': importNodeBuiltin,
      vitest,
      ...customPlugins,
    },
    rules: {
      ...esConfigGlobal.configs.recommended.rules,

      'node-import/prefer-node-protocol': 'error',

      'imports/order': [
        'error',
        {
          groups: [['builtin'], ['external'], ['internal'], ['parent', 'sibling', 'index']],
          pathGroups: [
            {
              pattern: 'node:*',
              group: 'builtin',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'ignore',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],

      // Merge custom rules
      ...customRules,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        // k6 globals
        __ENV: true,
      },
      // Merge custom language options
      ...customLanguageOptions,
    },
  };
}

function getTsConfig(esConfig, tsConfigGlobal, customRules = {}) {
  return mergeConfigs([
    esConfig,
    ...tsConfigGlobal.configs.recommended,
    {
      rules: {
        '@typescript-eslint/ban-ts-comment': 'off',
        'vitest/expect-expect': 'off',
        '@typescript-eslint/no-unused-expressions': [
          'error',
          {
            allowShortCircuit: true,
            allowTernary: true,
          },
        ],
        // Merge custom TypeScript-specific rules
        ...customRules,
      },
    },
  ]);
}

function mergeConfigs(esConfArr) {
  return esConfArr.reduce(
    (a, b) => ({
      ...a,
      ...b,
      rules: {
        ...(a.rules ?? {}),
        ...(b.rules ?? {}),
      },
      plugins: {
        ...(a.plugins ?? {}),
        ...(b.plugins ?? {}),
      },
      languageOptions: {
        ...(a.languageOptions ?? {}),
        ...(b.languageOptions ?? {}),
      },
    }),
    {},
  );
}
