import { SnapshotStrategy } from '@mcp-tuikit/snapshot';
import { SessionHandler } from '@mcp-tuikit/tmux';
import { OsascriptSpawnedBackend } from '../base/OsascriptSpawnedBackend.js';
import { IdType } from '../base/TerminalBackend.js';

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
    return `set newTab to do script "${tmuxCmd.replace(/"/g, '\\"')}"`;
  }

  protected generateCloseCmd(windowId: IdType): string {
    return `close (every window whose id is ${windowId})`;
  }
}
