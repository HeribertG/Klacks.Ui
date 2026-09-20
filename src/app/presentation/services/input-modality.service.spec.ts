// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { InputModalityService } from './input-modality.service';

describe('InputModalityService', () => {
  let matchMediaSpy: ReturnType<typeof vi.fn>;

  const mediaQueryList = (matches: boolean) => ({
    matches,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });

  beforeEach(() => {
    matchMediaSpy = vi.fn().mockReturnValue(mediaQueryList(false));
    vi.stubGlobal('matchMedia', matchMediaSpy);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('starts in mouse mode when the primary pointer is fine', () => {
    const service = TestBed.inject(InputModalityService);

    expect(service.isTouchMode()).toBe(false);
    expect(service.pointerType()).toBe('mouse');
  });

  it('starts in touch mode when the primary pointer is coarse', () => {
    matchMediaSpy.mockReturnValue(mediaQueryList(true));

    const service = TestBed.inject(InputModalityService);

    expect(service.isTouchMode()).toBe(true);
  });

  it('switches to touch mode after a touch pointerdown and back after a mouse pointerdown', () => {
    const service = TestBed.inject(InputModalityService);

    document.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }));
    expect(service.isTouchMode()).toBe(true);

    document.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', bubbles: true }));
    expect(service.isTouchMode()).toBe(false);
  });

  it('treats a pen pointerdown as touch mode', () => {
    const service = TestBed.inject(InputModalityService);

    document.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'pen', bubbles: true }));

    expect(service.isTouchMode()).toBe(true);
    expect(service.pointerType()).toBe('pen');
  });

  it('reports finger mode for a finger only and not for a pen or a mouse', () => {
    const service = TestBed.inject(InputModalityService);

    document.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }));
    expect(service.isFingerMode()).toBe(true);

    document.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'pen', bubbles: true }));
    expect(service.isFingerMode()).toBe(false);
    expect(service.isTouchMode()).toBe(true);

    document.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', bubbles: true }));
    expect(service.isFingerMode()).toBe(false);
  });

  it('stops listening once the injector is destroyed', () => {
    const service = TestBed.inject(InputModalityService);

    TestBed.resetTestingModule();
    document.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }));

    expect(service.isTouchMode()).toBe(false);
  });
});
