// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { isMacContextClick, isMacPlatform } from './context-click.helper';

const mockPlatform = (platform: string, userAgentDataPlatform?: string): void => {
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform);
  Object.defineProperty(navigator, 'userAgentData', {
    value: userAgentDataPlatform === undefined ? undefined : { platform: userAgentDataPlatform },
    configurable: true,
  });
};

const click = (init: MouseEventInit): MouseEvent => new MouseEvent('mousedown', init);

describe('context-click.helper', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (navigator as unknown as Record<string, unknown>)['userAgentData'];
  });

  describe('on macOS', () => {
    beforeEach(() => mockPlatform('MacIntel'));

    it('treats Ctrl+primary click as context click', () => {
      expect(isMacContextClick(click({ button: 0, buttons: 1, ctrlKey: true }))).toBe(true);
    });

    it('treats a real secondary button as context click', () => {
      expect(isMacContextClick(click({ button: 2, buttons: 2 }))).toBe(true);
    });

    it('does not treat a plain primary click as context click', () => {
      expect(isMacContextClick(click({ button: 0, buttons: 1 }))).toBe(false);
    });

    it('does not treat Ctrl+middle click as context click', () => {
      expect(isMacContextClick(click({ button: 1, ctrlKey: true }))).toBe(false);
    });
  });

  describe('on non-Mac platforms', () => {
    beforeEach(() => mockPlatform('Win32'));

    it('does not treat Ctrl+primary click as context click', () => {
      expect(isMacContextClick(click({ button: 0, buttons: 1, ctrlKey: true }))).toBe(false);
    });

    it('still treats a real secondary button as context click', () => {
      expect(isMacContextClick(click({ button: 2, buttons: 2 }))).toBe(true);
    });
  });

  describe('platform detection', () => {
    it('prefers userAgentData.platform when available', () => {
      mockPlatform('Win32', 'macOS');
      expect(isMacPlatform()).toBe(true);
    });

    it('falls back to navigator.platform', () => {
      mockPlatform('MacIntel');
      expect(isMacPlatform()).toBe(true);
    });

    it('is false for Linux', () => {
      mockPlatform('Linux x86_64');
      expect(isMacPlatform()).toBe(false);
    });
  });
});
