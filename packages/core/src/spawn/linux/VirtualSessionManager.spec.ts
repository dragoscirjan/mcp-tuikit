import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { VirtualSessionManager } from './VirtualSessionManager.js';

describe('VirtualSessionManager', () => {
  describe('Fallback Logic', () => {
    let hasCommandSpy: ReturnType<typeof vi.spyOn>;
    let createXvfbSpy: ReturnType<typeof vi.spyOn>;
    let createSwaySpy: ReturnType<typeof vi.spyOn>;
    let createKwinSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hasCommandSpy = vi.spyOn(VirtualSessionManager as any, 'hasCommand');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createXvfbSpy = vi.spyOn(VirtualSessionManager as any, 'createXvfbSession').mockResolvedValue({ type: 'xvfb' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createSwaySpy = vi.spyOn(VirtualSessionManager as any, 'createSwaySession').mockResolvedValue({ type: 'sway' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createKwinSpy = vi.spyOn(VirtualSessionManager as any, 'createKwinSession').mockResolvedValue({ type: 'kwin' });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should fallback to sway if xvfb is missing', async () => {
      hasCommandSpy.mockImplementation(async (cmd: string) => cmd === 'sway');

      const session = await VirtualSessionManager.createSession();

      expect(session.type).toBe('sway');
      expect(hasCommandSpy).toHaveBeenCalledWith('Xvfb');
      expect(hasCommandSpy).toHaveBeenCalledWith('sway');
      expect(createSwaySpy).toHaveBeenCalled();
      expect(createXvfbSpy).not.toHaveBeenCalled();
    });

    it('should fallback to kwin if xvfb and sway are missing', async () => {
      hasCommandSpy.mockImplementation(async (cmd: string) => cmd === 'kwin_wayland');

      const session = await VirtualSessionManager.createSession();

      expect(session.type).toBe('kwin');
      expect(createKwinSpy).toHaveBeenCalled();
      expect(createXvfbSpy).not.toHaveBeenCalled();
      expect(createSwaySpy).not.toHaveBeenCalled();
    });

    it('should throw an informative error if no headless compositor is available', async () => {
      hasCommandSpy.mockResolvedValue(false);

      await expect(VirtualSessionManager.createSession()).rejects.toThrow(/No headless virtual compositor found/);
    });
  });
});
