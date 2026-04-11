import { TerminalBackend } from '@mcp-tuikit/core';
export declare class TmuxBackend implements TerminalBackend {
    createSession(cmd: string, cols: number, rows: number): Promise<string>;
    closeSession(sessionId: string): Promise<void>;
    sendKeys(sessionId: string, keys: string): Promise<object>;
    getScreenPlaintext(sessionId: string, maxLines: number): Promise<string>;
    getScreenJson(sessionId: string): Promise<object>;
    getSessionState(sessionId: string): Promise<string>;
    waitForText(sessionId: string, pattern: string, timeoutMs: number): Promise<object>;
}
