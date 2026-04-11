export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class TmuxExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TmuxExecutionError';
  }
}
