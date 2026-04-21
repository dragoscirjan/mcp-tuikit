import { exec } from 'node:child_process';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { SessionHandler, TimeoutError, TmuxExecutionError } from '@mcp-tuikit/core';
import { nanoid } from 'nanoid';

const execAsync = promisify(exec);

interface PipeSession {
  pipePath: string;
  stream: ReturnType<typeof createReadStream>;
}

export class TmuxSessionHandler implements SessionHandler {
  private activePipes: Map<string, PipeSession> = new Map();

  async createSession(cmd: string, cols: number, rows: number): Promise<string> {
    const sessionId = `mcp-${nanoid(8)}`;
    const tmuxCmd = `tmux new-session -d -s ${sessionId} -x ${cols} -y ${rows} "${cmd}"`;
    try {
      await execAsync(tmuxCmd);
    } catch (err) {
      throw new TmuxExecutionError(`Failed to create session: ${(err as Error).message}`);
    }

    return sessionId;
  }

  async closeSession(sessionId: string): Promise<void> {
    const pipe = this.activePipes.get(sessionId);
    if (pipe) {
      pipe.stream.destroy();
      this.activePipes.delete(sessionId);
      // Stop pipe-pane and clean up the fifo
      await execAsync(`tmux pipe-pane -t ${sessionId}`).catch(() => {});
      await fs.rm(pipe.pipePath).catch(() => {});
    }
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
    let lastText = '';

    while (Date.now() - start < timeoutMs) {
      try {
        const text = await this.getScreenPlaintext(sessionId, 0);
        lastText = text;
        if (regex.test(text)) {
          return { success: true, matchedPattern: pattern };
        }
      } catch {
        // Session may not be ready yet — keep polling
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }

    throw new TimeoutError(
      `Wait for text matched /${pattern}/ timed out after ${timeoutMs}ms.\nLast screen content:\n${lastText}`,
    );
  }

  onData(sessionId: string, listener: (data: string) => void): { dispose: () => void } {
    // tmux control mode (-C attach) exits immediately without a real PTY.
    // Use pipe-pane to stream raw ANSI output through a named pipe (FIFO) instead.
    const pipePath = path.join(os.tmpdir(), `tuikit-pipe-${nanoid(8)}`);
    let disposed = false;

    // Start the pipeline asynchronously — errors are swallowed so callers don't
    // need to await the registration.
    (async () => {
      try {
        await execAsync(`mkfifo ${pipePath}`);
        await execAsync(`tmux pipe-pane -t ${sessionId} "cat >> ${pipePath}"`);

        const readStream = createReadStream(pipePath, { encoding: 'utf8' });
        this.activePipes.set(sessionId, { pipePath, stream: readStream });

        readStream.on('data', (chunk: string) => {
          if (!disposed) listener(chunk);
        });
      } catch {
        // Session may not exist yet or pipe setup failed — nothing to stream.
      }
    })();

    return {
      dispose: () => {
        disposed = true;
        const pipe = this.activePipes.get(sessionId);
        if (pipe) {
          pipe.stream.destroy();
          this.activePipes.delete(sessionId);
          execAsync(`tmux pipe-pane -t ${sessionId}`).catch(() => {});
          fs.rm(pipe.pipePath).catch(() => {});
        }
      },
    };
  }
}
