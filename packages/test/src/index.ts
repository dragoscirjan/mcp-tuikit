import { describe, it } from 'vitest';

export const isMac = process.platform === 'darwin';
export const isWin = process.platform === 'win32';
export const isLinux = process.platform === 'linux';

// Platform-specific describes
export const describeMacos = describe.runIf(isMac);
export const describeWindows = describe.runIf(isWin);
export const describeLinux = describe.runIf(isLinux);

// Platform-specific its
export const itMacos = it.runIf(isMac);
export const itWindows = it.runIf(isWin);
export const itLinux = it.runIf(isLinux);

// Compound helpers
export const isPosix = isMac || isLinux;
export const describePosix = describe.runIf(isPosix);
export const itPosix = it.runIf(isPosix);


