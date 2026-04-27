import { describe, expect, it } from 'vitest';
import { TmuxExecutionError } from './errors.js';

describe('Tmux Errors', () => {
  it('instantiates TmuxExecutionError', () => {
    const err = new TmuxExecutionError('failed');
    expect(err).toBeInstanceOf(TmuxExecutionError);
    expect(err.message).toBe('failed');
    expect(err.name).toBe('TmuxExecutionError');
  });
});
