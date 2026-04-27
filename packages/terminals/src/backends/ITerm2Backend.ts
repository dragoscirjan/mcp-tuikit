import { OsascriptSpawnedBackend, SessionHandler, SnapshotStrategy, IdType } from '@mcp-tuikit/core';

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
