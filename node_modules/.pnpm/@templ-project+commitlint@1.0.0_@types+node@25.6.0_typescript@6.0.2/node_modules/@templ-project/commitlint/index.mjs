/**
 * @typedef {import('@commitlint/types').UserConfig} UserConfig
 */

/**
 * Returns the commitlint configuration.
 * @param {Partial<UserConfig>} [options={}] - Configuration options for commitlint.
 * @returns {UserConfig}
 */
export default (options = {}) => ({
  extends: ['@commitlint/config-conventional'],
  ...options,
});
