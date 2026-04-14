// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { KlacksyNavigationService } from './klacksy-navigation.service';
import { KlacksyTelemetryService } from './klacksy-telemetry.service';

describe('KlacksyNavigationService', () => {
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };
  let telemetry: { trackTargetMiss: ReturnType<typeof vi.fn> };
  let service: KlacksyNavigationService;

  beforeEach(() => {
    router = { navigateByUrl: vi.fn().mockResolvedValue(true) };
    telemetry = { trackTargetMiss: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        KlacksyNavigationService,
        { provide: Router, useValue: router },
        { provide: KlacksyTelemetryService, useValue: telemetry }
      ]
    });
    service = TestBed.inject(KlacksyNavigationService);
    document.body.innerHTML = '';
  });

  it('navigates without target and returns success', async () => {
    const result = await service.navigateAndScroll('/settings');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/settings');
    expect(result.success).toBe(true);
  });

  it('scrolls to target when element exists', async () => {
    const el = document.createElement('div');
    el.setAttribute('data-klacksy-target', 'llm-provider');
    el.scrollIntoView = vi.fn();
    document.body.appendChild(el);
    const result = await service.navigateAndScroll('/settings', 'llm-provider');
    expect(result.success).toBe(true);
    expect(el.classList.contains('klacksy-highlight')).toBe(true);
  });

  it('falls back gracefully when target missing', async () => {
    const result = await service.navigateAndScroll('/settings', 'nonexistent');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('target-not-found');
    expect(telemetry.trackTargetMiss).toHaveBeenCalled();
  }, 5000);
});
