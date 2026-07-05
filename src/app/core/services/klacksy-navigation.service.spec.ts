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

  it('never scrolls an overflow:hidden shell ancestor when a nested scroll container exists', async () => {
    // Mirrors the real app shell: #main_container (overflow:hidden, holds the
    // fixed header/footer) wrapping app-main's own overflow:auto content area.
    const shell = document.createElement('div');
    shell.style.overflowY = 'hidden';
    let shellScrollTopSets = 0;
    Object.defineProperty(shell, 'scrollTop', {
      get: () => 0,
      set: () => { shellScrollTopSets++; },
    });
    shell.scrollIntoView = vi.fn();

    const scrollArea = document.createElement('div');
    scrollArea.style.overflowY = 'auto';

    const el = document.createElement('div');
    el.setAttribute('data-klacksy-target', 'user-management');
    el.scrollIntoView = vi.fn();

    scrollArea.appendChild(el);
    shell.appendChild(scrollArea);
    document.body.appendChild(shell);

    const result = await service.navigateAndScroll('/settings', 'user-management');

    expect(result.success).toBe(true);
    expect(shellScrollTopSets).toBe(0);
    expect(shell.scrollIntoView).not.toHaveBeenCalled();
    expect(el.scrollIntoView).not.toHaveBeenCalled();
  });

  it('falls back gracefully when target missing', async () => {
    const result = await service.navigateAndScroll('/settings', 'nonexistent');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('target-not-found');
    expect(telemetry.trackTargetMiss).toHaveBeenCalled();
  }, 5000);

  it('highlights an existing nav icon by id', () => {
    const icon = document.createElement('button');
    icon.id = 'open-settings';
    document.body.appendChild(icon);

    const result = service.highlightNavIcon('open-settings');

    expect(result).toBe(true);
    expect(icon.classList.contains('klacksy-highlight')).toBe(true);
    expect(icon.classList.contains('klacksy-highlight-icon')).toBe(true);
  });

  it('pulses the nav icon of the destination route after navigating', async () => {
    const icon = document.createElement('button');
    icon.id = 'open-absences';
    document.body.appendChild(icon);

    await service.navigateAndScroll('/workplace/absence');

    expect(icon.classList.contains('klacksy-highlight-icon')).toBe(true);
  });

  it('falls back to the company logo image for the dashboard route', async () => {
    const logoImage = document.createElement('img');
    logoImage.id = 'header-logo-image';
    document.body.appendChild(logoImage);

    await service.navigateAndScroll('/workplace/dashboard?tab=resources');

    expect(logoImage.classList.contains('klacksy-highlight-icon')).toBe(true);
  });

  it('does not pulse anything for routes without a mapped nav icon', async () => {
    const result = await service.navigateAndScroll('/workplace/profile');

    expect(result.success).toBe(true);
    expect(telemetry.trackTargetMiss).not.toHaveBeenCalled();
  });

  it('reports a miss when the nav icon does not exist', () => {
    const result = service.highlightNavIcon('open-nonexistent');

    expect(result).toBe(false);
    expect(telemetry.trackTargetMiss).toHaveBeenCalledWith('main-nav', 'open-nonexistent');
  });

  describe('re-anchoring while async cards grow the page', () => {
    let container: HTMLDivElement;
    let el: HTMLDivElement;
    let containerHeight: number;
    let scrollAdjustCount: number;

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] });
      container = document.createElement('div');
      container.style.overflowY = 'auto';
      containerHeight = 1000;
      scrollAdjustCount = 0;
      Object.defineProperty(container, 'scrollHeight', { get: () => containerHeight });
      Object.defineProperty(container, 'scrollTop', {
        get: () => 0,
        set: () => { scrollAdjustCount++; },
      });
      el = document.createElement('div');
      el.setAttribute('data-klacksy-target', 'assistant-speech');
      el.scrollIntoView = vi.fn();
      container.appendChild(el);
      document.body.appendChild(container);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('scrolls only the nested scroll container, never the outer app shell', async () => {
      await service.navigateAndScroll('/settings', 'assistant-speech');
      expect(el.scrollIntoView).not.toHaveBeenCalled();
      expect(scrollAdjustCount).toBe(1);
    });

    it('scrolls immediately and re-anchors when the container keeps growing', async () => {
      const result = await service.navigateAndScroll('/settings', 'assistant-speech');
      expect(result.success).toBe(true);
      expect(scrollAdjustCount).toBe(1);

      containerHeight = 1800;
      await vi.advanceTimersByTimeAsync(200);
      expect(scrollAdjustCount).toBe(2);

      containerHeight = 2400;
      await vi.advanceTimersByTimeAsync(200);
      expect(scrollAdjustCount).toBe(3);
    });

    it('does not re-anchor when the layout is stable', async () => {
      await service.navigateAndScroll('/settings', 'assistant-speech');
      await vi.advanceTimersByTimeAsync(1000);
      expect(scrollAdjustCount).toBe(1);
    });

    it('stops re-anchoring after user scroll intent', async () => {
      await service.navigateAndScroll('/settings', 'assistant-speech');
      window.dispatchEvent(new Event('wheel'));
      containerHeight = 1800;
      await vi.advanceTimersByTimeAsync(500);
      expect(scrollAdjustCount).toBe(1);
    });

    it('stops re-anchoring once the target leaves the DOM', async () => {
      await service.navigateAndScroll('/settings', 'assistant-speech');
      container.removeChild(el);
      containerHeight = 1800;
      await vi.advanceTimersByTimeAsync(500);
      expect(scrollAdjustCount).toBe(1);
    });

    it('stops re-anchoring after the anchor window elapses', async () => {
      await service.navigateAndScroll('/settings', 'assistant-speech');
      await vi.advanceTimersByTimeAsync(6000);
      containerHeight = 1800;
      await vi.advanceTimersByTimeAsync(500);
      expect(scrollAdjustCount).toBe(1);
    });
  });
});
