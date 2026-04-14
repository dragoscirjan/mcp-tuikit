import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { SessionHandler, TimeoutError, TmuxExecutionError } from '@mcp-tuikit/core';
import { nanoid } from 'nanoid';

const execAsync = promisify(exec);

export class TmuxSessionHandler implements SessionHandler {
  async createSession(cmd: string, cols: number, rows: number): Promise<string> {
    const sessionId = `mcp-${nanoid(8)}`;
    const tmuxCmd = `tmux new-session -d -s ${sessionId} -x ${cols} -y ${rows} "${cmd}"`;
    try {
      await execAsync(tmuxCmd);
    } catch (err) {
      throw new TmuxExecutionError(`Failed to create session: ${(err as Error).message}`);
    }

    if (process.env.TUIKIT_HEADED === '1') {
      try {
        await execAsync(`open -a Terminal "tmux attach-session -t ${sessionId}"`);
      } catch {
        // Ignore failure
      }
    }

    return sessionId;
  }

  async closeSession(sessionId: string): Promise<void> {
    try {
      await execAsync(`tmux kill-session -t ${sessionId}`);
    } catch (err) {
      throw new TmuxExecutionError(`Failed to close session: ${(err as Error).message}`);
    }
  }

  async sendKeys(sessionId: string, keys: string): Promise<object> {
    try {
      await execAsync(`tmux send-keys -t ${sessionId} "${keys}"`);
      return { success: true };
    } catch (err) {
      throw new TmuxExecutionError(`Failed to send keys: ${(err as Error).message}`);
    }
  }

  async getScreenPlaintext(sessionId: string, maxLines: number): Promise<string> {
    try {
      const { stdout } = await execAsync(`tmux capture-pane -p -t ${sessionId}`);
      const lines = stdout.split('\n');

      // Remove trailing empty lines that tmux sometimes outputs
      while (lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop();
      }

      if (maxLines && maxLines > 0 && lines.length > maxLines) {
        return lines.slice(lines.length - maxLines).join('\n');
      }
      return lines.join('\n');
    } catch (err) {
      throw new TmuxExecutionError(`Failed to get screen plaintext: ${(err as Error).message}`);
    }
  }

  async getScreenJson(sessionId: string): Promise<object> {
    const text = await this.getScreenPlaintext(sessionId, 0);
    return {
      content: text,
      cursor: { x: 0, y: 0 },
      dimensions: { cols: 80, rows: 24 },
    };
  }

  async getSessionState(sessionId: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`tmux display-message -p -t ${sessionId} '#{session_id}'`);
      return stdout.trim();
    } catch {
      // tmux exits non-zero when the session doesn't exist; treat as empty state
      return '';
    }
  }

  async waitForText(sessionId: string, pattern: string, timeoutMs: number): Promise<object> {
    const start = Date.now();
    const intervalMs = 500;
    const regex = new RegExp(pattern);

    while (Date.now() - start < timeoutMs) {
      try {
        const text = await this.getScreenPlaintext(sessionId, 0);
        if (regex.test(text)) {
          return { success: true, matchedPattern: pattern };
        }
      } catch {
        // Session may not be ready yet — keep polling
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }

    throw new TimeoutError(`Wait for text matched /${pattern}/ timed out after ${timeoutMs}ms.`);
  }
}
