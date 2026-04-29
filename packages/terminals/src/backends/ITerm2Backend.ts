import { SnapshotStrategy } from '@mcp-tuikit/snapshot';
import { SessionHandler } from '@mcp-tuikit/tmux';
import { OsascriptSpawnedBackend } from '../base/OsascriptSpawnedBackend.js';
import { IdType } from '../base/TerminalBackend.js';

// jscpd:ignore-start
export class ITerm2Backend extends OsascriptSpawnedBackend {
  protected get appName(): string {
    return 'iTerm';
  }

  protected get generateFocusCmd(): string {
    return `select targetWindow`;
  }

  constructor(sessionHandler: SessionHandler, snapshotStrategy: SnapshotStrategy) {
    super(sessionHandler, snapshotStrategy);
  }

  protected generateSpawnCmd(tmuxCmd: string): string {
    return `create window with default profile command "${tmuxCmd}"`;
  }

  protected generateCloseCmd(windowId: IdType): string {
    return `set targetWindow to window id ${windowId}\nclose targetWindow`;
  }
}
// jscpd:ignore-end
