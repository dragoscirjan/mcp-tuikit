import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getBackendConfig, isHeadedMode } from './config';

describe('getBackendConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.TUIKIT_TERMINAL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('defaults to xterm.js when TUIKIT_TERMINAL is not set', () => {
    expect(getBackendConfig()).toBe('xterm.js');
  });

  it('returns TUIKIT_TERMINAL when set to xterm.js', () => {
    process.env.TUIKIT_TERMINAL = 'xterm.js';
    expect(getBackendConfig()).toBe('xterm.js');
  });

  it('returns TUIKIT_TERMINAL when set to ghostty', () => {
    process.env.TUIKIT_TERMINAL = 'ghostty';
    expect(getBackendConfig()).toBe('ghostty');
  });

  it('returns TUIKIT_TERMINAL when set to iterm2', () => {
    process.env.TUIKIT_TERMINAL = 'iterm2';
    expect(getBackendConfig()).toBe('iterm2');
  });

  it('returns TUIKIT_TERMINAL when set to alacritty', () => {
    process.env.TUIKIT_TERMINAL = 'alacritty';
    expect(getBackendConfig()).toBe('alacritty');
  });

  it('returns TUIKIT_TERMINAL when set to wezterm', () => {
    process.env.TUIKIT_TERMINAL = 'wezterm';
    expect(getBackendConfig()).toBe('wezterm');
  });
});

describe('isHeadedMode', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.TUIKIT_HEADLESS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns true (headed) when TUIKIT_HEADLESS is not set', () => {
    expect(isHeadedMode()).toBe(true);
  });

  it('returns true (headed) when TUIKIT_HEADLESS=0', () => {
    process.env.TUIKIT_HEADLESS = '0';
    expect(isHeadedMode()).toBe(true);
  });

  it('returns false (headless) when TUIKIT_HEADLESS=1', () => {
    process.env.TUIKIT_HEADLESS = '1';
    expect(isHeadedMode()).toBe(false);
  });
});
