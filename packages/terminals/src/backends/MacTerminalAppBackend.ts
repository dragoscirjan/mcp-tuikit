import { SessionHandler } from '@mcp-tuikit/core';
import { OsascriptSpawnedBackend } from '../OsascriptSpawnedBackend.js';
import { SnapshotStrategy } from '../SnapshotStrategy.js';
import { IdType } from '../TerminalBackend.js';

/* jscpd:ignore-start */
export class MacTerminalAppBackend extends OsascriptSpawnedBackend {
  protected get appName(): string {
    return 'Terminal';
  }

  protected get generateFocusCmd(): string {
    return `set frontmost of targetWindow to true`;
  }

  constructor(sessionHandler: SessionHandler, snapshotStrategy: SnapshotStrategy) {
    super(sessionHandler, snapshotStrategy);
  }

  protected generateSpawnCmd(tmuxCmd: string): string {
    return `set newTab to do script "${tmuxCmd}"`;
  }

  protected generateCloseCmd(windowId: IdType): string {
    return `close (every window whose id is ${windowId})`;
  }
}
