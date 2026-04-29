import { describe, it, expect } from 'vitest';
import { TimeoutError } from './errors.js';

describe('Errors', () => {
  it('instantiates TimeoutError', () => {
    const err = new TimeoutError('timed out');
    expect(err.message).toBe('timed out');
    expect(err.name).toBe('TimeoutError');
    expect(err).toBeInstanceOf(Error);
  });
});
