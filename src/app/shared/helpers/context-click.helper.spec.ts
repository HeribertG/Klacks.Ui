// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  isMacContextClick,
  isMacPlatform,
  isSecondaryPointer,
  isTouchLikePointer,
} from './context-click.helper';

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

  describe('test environment capabilities', () => {
    it('constructs PointerEvents that keep pointerType, buttons and isPrimary', () => {
      const event = new PointerEvent('pointerdown', {
        pointerType: 'touch',
        pointerId: 7,
        isPrimary: true,
        buttons: 1,
        clientX: 11,
        clientY: 22,
      });

      expect(event.pointerType).toBe('touch');
      expect(event.pointerId).toBe(7);
      expect(event.isPrimary).toBe(true);
      expect(event.buttons).toBe(1);
      expect(event.clientX).toBe(11);
      expect(event.clientY).toBe(22);
    });

    it('constructs MouseEvents that keep button and buttons', () => {
      const event = new MouseEvent('mousedown', { button: 0, buttons: 1 });

      expect(event.button).toBe(0);
      expect(event.buttons).toBe(1);
    });
  });

  describe('isTouchLikePointer / isSecondaryPointer', () => {
    const pointer = (init: PointerEventInit): PointerEvent =>
      new PointerEvent('pointerdown', init);

    beforeEach(() => mockPlatform('Win32'));

    it('treats touch and pen as touch-like, mouse not', () => {
      expect(isTouchLikePointer(pointer({ pointerType: 'touch' }))).toBe(true);
      expect(isTouchLikePointer(pointer({ pointerType: 'pen' }))).toBe(true);
      expect(isTouchLikePointer(pointer({ pointerType: 'mouse' }))).toBe(false);
    });

    it('detects the pen barrel button as secondary', () => {
      expect(isSecondaryPointer(pointer({ pointerType: 'pen', button: 0, buttons: 2 }))).toBe(true);
      expect(isSecondaryPointer(pointer({ pointerType: 'pen', button: 0, buttons: 1 }))).toBe(false);
    });

    it('falls back to isMacContextClick for mouse', () => {
      expect(isSecondaryPointer(pointer({ pointerType: 'mouse', button: 2 }))).toBe(true);
      expect(isSecondaryPointer(pointer({ pointerType: 'mouse', button: 0, buttons: 1 }))).toBe(false);
    });

    it('does not treat a plain finger press as secondary', () => {
      expect(isSecondaryPointer(pointer({ pointerType: 'touch', button: 0, buttons: 1 }))).toBe(false);
    });
  });
});
