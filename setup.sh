#!/bin/bash
set -e

# Core
cd packages/core/src
mv TerminalBackend.ts SessionHandler.ts

cat << 'INNER_EOF' > TerminalBackend.ts
import { SessionHandler } from './SessionHandler.js';
import { SnapshotStrategy } from './SnapshotStrategy.js';

export abstract class TerminalBackend {
    constructor(
        protected sessionHandler: SessionHandler,
        protected snapshotStrategy: SnapshotStrategy
    ) {}

    abstract connect(): Promise<void>;
    abstract disconnect(): Promise<void>;
}
INNER_EOF

cat << 'INNER_EOF' > SnapshotStrategy.ts
export interface SnapshotStrategy {
    takeSnapshot(): Promise<string>;
}
INNER_EOF

sed -i '' 's/TerminalBackend/SessionHandler/g' SessionHandler.ts
sed -i '' 's/TerminalBackend/SessionHandler/g' index.ts
echo "export * from './TerminalBackend.js';" >> index.ts
echo "export * from './SnapshotStrategy.js';" >> index.ts
cd ../../../

# Tmux
cd packages/tmux/src
mv TmuxBackend.ts TmuxSessionHandler.ts
sed -i '' 's/TmuxBackend/TmuxSessionHandler/g' TmuxSessionHandler.ts
sed -i '' 's/TerminalBackend/SessionHandler/g' TmuxSessionHandler.ts
sed -i '' 's/TmuxBackend/TmuxSessionHandler/g' index.ts
sed -i '' 's/TmuxBackend.js/TmuxSessionHandler.js/g' index.ts
cd ../../../

# Terminals
mkdir -p packages/terminals/src
cp -r packages/flow-engine/src/snapshotters packages/terminals/src/
cp packages/flow-engine/src/spawner.ts packages/terminals/src/
cp packages/flow-engine/src/config.ts packages/terminals/src/
rm -rf packages/terminals/src/snapshotters/windows
rm -rf packages/terminals/src/snapshotters/linux

cat << 'INNER_EOF' > packages/terminals/src/BackendFactory.ts
export class BackendFactory {
    static create(backend: string): any {
        // stub
        return null;
    }
}
INNER_EOF

cat << 'INNER_EOF' > packages/terminals/src/index.ts
export * from './BackendFactory.js';
INNER_EOF

cd packages/terminals
npm init -y
sed -i '' 's/"name": "terminals"/"name": "@mcp-tuikit\/terminals"/g' package.json
# basic stub package.json
cd ../../

