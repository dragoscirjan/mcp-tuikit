export interface TestMode {
  headless: boolean;
  suffix: string;
}

export function getHeadlessTestModes(): TestMode[] {
  if (process.platform !== 'linux') {
    return [{ headless: process.env.TUIKIT_HEADLESS !== '0', suffix: '' }];
  }

  const mode = process.env.TUIKIT_HEADLESS_TEST || '1';

  if (mode === 'all') {
    return [
      { headless: true, suffix: ' [Headless]' },
      { headless: false, suffix: ' [Headed]' },
    ];
  }

  if (mode === '0') {
    return [{ headless: false, suffix: ' [Headed]' }];
  }

  return [{ headless: true, suffix: ' [Headless]' }];
}
