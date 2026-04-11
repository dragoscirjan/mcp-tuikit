export interface TerminalBackend {
    createSession(cmd: string, cols: number, rows: number): Promise<string>;
    closeSession(sessionId: string): Promise<void>;
    sendKeys(sessionId: string, keys: string): Promise<object>;
    waitForText(sessionId: string, pattern: string, timeoutMs: number): Promise<object>;
    getScreenPlaintext(sessionId: string, maxLines: number): Promise<string>;
    getScreenJson(sessionId: string): Promise<object>;
    getSessionState(sessionId: string): Promise<string>;
}
//# sourceMappingURL=TerminalBackend.d.ts.map