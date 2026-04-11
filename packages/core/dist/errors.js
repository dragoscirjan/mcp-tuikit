export class TimeoutError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TimeoutError';
    }
}
export class TmuxExecutionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TmuxExecutionError';
    }
}
//# sourceMappingURL=errors.js.map