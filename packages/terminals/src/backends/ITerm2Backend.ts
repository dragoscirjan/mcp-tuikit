import { SessionHandler } from '@mcp-tuikit/core';
import { OsascriptSpawnedBackend } from '../OsascriptSpawnedBackend.js';
import { SnapshotStrategy } from '../SnapshotStrategy.js';
import { IdType } from '../TerminalBackend.js';

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
