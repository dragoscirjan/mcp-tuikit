import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getBackendConfig } from './config';

describe('Config', () => {
  const originalEnv = process.env;
  const originalPlatform = process.platform;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    });
  });

  it('should return process.env.TUIKIT_TERMINAL if set', () => {
    process.env.TUIKIT_TERMINAL = 'custom-term';
    expect(getBackendConfig()).toBe('custom-term');
  });

  it('should default to iterm2 on darwin', () => {
    delete process.env.TUIKIT_TERMINAL;
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
    });
    expect(getBackendConfig()).toBe('iterm2');
  });

  it('should default to gnome-terminal on linux', () => {
    delete process.env.TUIKIT_TERMINAL;
    Object.defineProperty(process, 'platform', {
      value: 'linux',
    });
    expect(getBackendConfig()).toBe('gnome-terminal');
  });

  it('should default to windows-terminal on win32', () => {
    delete process.env.TUIKIT_TERMINAL;
    Object.defineProperty(process, 'platform', {
      value: 'win32',
    });
    expect(getBackendConfig()).toBe('windows-terminal');
  });

  it('should fallback to xterm for unknown platforms if no env set', () => {
    delete process.env.TUIKIT_TERMINAL;
    Object.defineProperty(process, 'platform', {
      value: 'freebsd',
    });
    expect(getBackendConfig()).toBe('xterm');
  });
});
