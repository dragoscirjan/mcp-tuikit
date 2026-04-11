import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { TimeoutError, TmuxExecutionError } from '@mcp-tuikit/core';
const execAsync = promisify(exec);
export class TmuxBackend {
    async createSession(cmd, cols, rows) {
        const sessionId = `mcp-${Date.now()}`;
        const tmuxCmd = `tmux new-session -d -s ${sessionId} -x ${cols} -y ${rows} "${cmd}"`;
        try {
            await execAsync(tmuxCmd);
        }
        catch (err) {
            throw new TmuxExecutionError(`Failed to create session: ${err.message}`);
        }
        if (process.env.TUIKIT_HEADED === '1') {
            try {
                await execAsync(`open -a Terminal "tmux attach-session -t ${sessionId}"`);
            }
            catch {
            }
        }
        return sessionId;
    }
    async closeSession(sessionId) {
        try {
            await execAsync(`tmux kill-session -t ${sessionId}`);
        }
        catch (err) {
            throw new TmuxExecutionError(`Failed to close session: ${err.message}`);
        }
    }
    async sendKeys(sessionId, keys) {
        try {
            await execAsync(`tmux send-keys -t ${sessionId} "${keys}"`);
            return { success: true };
        }
        catch (err) {
            throw new TmuxExecutionError(`Failed to send keys: ${err.message}`);
        }
    }
    async getScreenPlaintext(sessionId, maxLines) {
        try {
            const { stdout } = await execAsync(`tmux capture-pane -p -t ${sessionId}`);
            const lines = stdout.split('\n');
            while (lines.length > 0 && lines[lines.length - 1] === '') {
                lines.pop();
            }
            if (maxLines && maxLines > 0 && lines.length > maxLines) {
                return lines.slice(lines.length - maxLines).join('\n');
            }
            return lines.join('\n');
        }
        catch (err) {
            throw new TmuxExecutionError(`Failed to get screen plaintext: ${err.message}`);
        }
    }
    async getScreenJson(sessionId) {
        const text = await this.getScreenPlaintext(sessionId, 0);
        return {
            content: text,
            cursor: { x: 0, y: 0 },
            dimensions: { cols: 80, rows: 24 },
        };
    }
    async getSessionState(sessionId) {
        try {
            const { stdout } = await execAsync(`tmux display-message -p -t ${sessionId} '#{session_id}'`);
            return stdout.trim();
        }
        catch (err) {
            throw new TmuxExecutionError(`Failed to get session state: ${err.message}`);
        }
    }
    async waitForText(sessionId, pattern, timeoutMs) {
        const start = Date.now();
        const intervalMs = 500;
        const regex = new RegExp(pattern);
        while (Date.now() - start < timeoutMs) {
            const text = await this.getScreenPlaintext(sessionId, 0);
            if (regex.test(text)) {
                return { success: true, matchedPattern: pattern };
            }
            await new Promise((r) => setTimeout(r, intervalMs));
        }
        throw new TimeoutError(`Wait for text matched /${pattern}/ timed out after ${timeoutMs}ms.`);
    }
}
//# sourceMappingURL=TmuxBackend.js.map