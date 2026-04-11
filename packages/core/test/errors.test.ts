import { describe, it, expect } from 'vitest';
import { TimeoutError, TmuxExecutionError } from '../src/errors.js';

describe('Errors', () => {
  it('instantiates TimeoutError', () => {
    const err = new TimeoutError('timed out');
    expect(err.message).toBe('timed out');
    expect(err.name).toBe('TimeoutError');
    expect(err).toBeInstanceOf(Error);
  });

  it('instantiates TmuxExecutionError', () => {
    const err = new TmuxExecutionError('failed');
    expect(err.message).toBe('failed');
    expect(err.name).toBe('TmuxExecutionError');
    expect(err).toBeInstanceOf(Error);
  });
});
