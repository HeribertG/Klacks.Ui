// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { KlacksyNavigationService } from './klacksy-navigation.service';
import { KlacksyTelemetryService } from './klacksy-telemetry.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { NoAccessReasonService } from 'src/app/domain/services/navigation/no-access-reason.service';
import {
  NO_ACCESS_REASON_FEATURE,
  NO_ACCESS_REASON_PERMISSION,
} from 'src/app/domain/constants/no-access-reason.constants';
import {
  NAVIGATION_REASON_FEATURE_DISABLED,
  NAVIGATION_REASON_PERMISSION_DENIED,
} from 'src/app/domain/constants/navigation-outcome.constants';

describe('KlacksyNavigationService', () => {
  let router: { url: string; navigateByUrl: ReturnType<typeof vi.fn> };
  let telemetry: { trackTargetMiss: ReturnType<typeof vi.fn> };
  let eventBus: { emit: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn>; onAny: ReturnType<typeof vi.fn> };
  let service: KlacksyNavigationService;
  let noAccessReason: NoAccessReasonService;

  beforeEach(() => {
    router = { url: '/workplace/dashboard', navigateByUrl: vi.fn().mockResolvedValue(true) };
    telemetry = { trackTargetMiss: vi.fn() };
    eventBus = { emit: vi.fn(), on: vi.fn(), onAny: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        KlacksyNavigationService,
        { provide: Router, useValue: router },
        { provide: KlacksyTelemetryService, useValue: telemetry },
        { provide: EVENT_BUS_TOKEN, useValue: eventBus }
      ]
    });
    service = TestBed.inject(KlacksyNavigationService);
    noAccessReason = TestBed.inject(NoAccessReasonService);
    document.body.innerHTML = '';
  });

  it('navigates without target and returns success', async () => {
    const result = await service.navigateAndScroll('/settings');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/settings');
    expect(result.success).toBe(true);
  });

  it('does not navigate for a shell target on the global route, it only highlights it', async () => {
    const input = document.createElement('input');
    const el = document.createElement('div');
    el.setAttribute('data-klacksy-target', 'header-search');
    el.scrollIntoView = vi.fn();
    el.appendChild(input);
    document.body.appendChild(el);

    const result = await service.navigateAndScroll('/', 'header-search');

    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(el.classList.contains('klacksy-highlight')).toBe(true);
    expect(document.activeElement).toBe(input);
  });

  it('reports target-not-found for a missing shell target without navigating', async () => {
    const result = await service.navigateAndScroll('/', 'plan-execution-panel');

    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.reason).toBe('target-not-found');
    expect(telemetry.trackTargetMiss).toHaveBeenCalledWith('/workplace/dashboard', 'plan-execution-panel');
  });

  it('stays put for the global route without a target', async () => {
    const result = await service.navigateAndScroll('/');

    expect(router.navigateByUrl).not.toHaveBeenCalled();
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

  it('falls back to a DOM id when no data-klacksy-target attribute matches', async () => {
    const el = document.createElement('div');
    el.id = 'erp-drop-points-upload-zone';
    el.scrollIntoView = vi.fn();
    document.body.appendChild(el);

    const result = await service.navigateAndScroll('/settings', 'erp-drop-points-upload-zone');

    expect(result.success).toBe(true);
    expect(el.classList.contains('klacksy-highlight')).toBe(true);
  });

  it('prefers the data-klacksy-target attribute over a same-named DOM id', async () => {
    const byId = document.createElement('div');
    byId.id = 'duplicate-target';
    byId.scrollIntoView = vi.fn();
    document.body.appendChild(byId);

    const byAttribute = document.createElement('div');
    byAttribute.setAttribute('data-klacksy-target', 'duplicate-target');
    byAttribute.scrollIntoView = vi.fn();
    document.body.appendChild(byAttribute);

    await service.navigateAndScroll('/settings', 'duplicate-target');

    expect(byAttribute.classList.contains('klacksy-highlight')).toBe(true);
    expect(byId.classList.contains('klacksy-highlight')).toBe(false);
  });

  it('does not throw and reports target-not-found for a target that would be an invalid #id selector', async () => {
    const result = await service.navigateAndScroll('/settings', '123.invalid:target');

    expect(result.success).toBe(false);
    expect(result.reason).toBe('target-not-found');
    expect(telemetry.trackTargetMiss).toHaveBeenCalledWith('/settings', '123.invalid:target');
  }, 5000);

  it('does not let a CSS-selector-injection target reach an unrelated element', async () => {
    const password = document.createElement('input');
    password.type = 'password';
    document.body.appendChild(password);

    const result = await service.navigateAndScroll('/settings', 'x"],input[type=password');

    expect(result.success).toBe(false);
    expect(result.reason).toBe('target-not-found');
  }, 5000);

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

  it('emits a target-requested event before looking up the marker, so a collapsed panel can expand', async () => {
    const el = document.createElement('div');
    el.setAttribute('data-klacksy-target', 'goal-candidates-panel.approve');
    el.scrollIntoView = vi.fn();
    document.body.appendChild(el);

    await service.navigateAndScroll('/', 'goal-candidates-panel.approve');

    expect(eventBus.emit).toHaveBeenCalledWith(DomainEventType.KLACKSY_TARGET_REQUESTED, {
      target: 'goal-candidates-panel.approve',
    });
  });

  it('scrolls a nested scrollable list even when the panel around it has no overflow of its own', async () => {
    // Mirrors goal-candidates-panel: .chat-container-integrated (overflow:hidden) wraps
    // the panel directly (no overflow), which wraps .goal-candidate-list (overflow:auto).
    const shell = document.createElement('div');
    shell.style.overflowY = 'hidden';
    shell.scrollIntoView = vi.fn();

    const panel = document.createElement('div');

    const list = document.createElement('ul');
    list.style.overflowY = 'auto';
    let listScrollTopSets = 0;
    Object.defineProperty(list, 'scrollTop', {
      get: () => 0,
      set: () => { listScrollTopSets++; },
    });

    const el = document.createElement('li');
    el.setAttribute('data-klacksy-target', 'goal-candidates-panel.approve');
    el.scrollIntoView = vi.fn();

    list.appendChild(el);
    panel.appendChild(list);
    shell.appendChild(panel);
    document.body.appendChild(shell);

    const result = await service.navigateAndScroll('/', 'goal-candidates-panel.approve');

    expect(result.success).toBe(true);
    expect(listScrollTopSets).toBe(1);
    expect(shell.scrollIntoView).not.toHaveBeenCalled();
    expect(el.scrollIntoView).not.toHaveBeenCalled();
  });

  it('falls back gracefully when target missing', async () => {
    const result = await service.navigateAndScroll('/settings', 'nonexistent');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('target-not-found');
    expect(telemetry.trackTargetMiss).toHaveBeenCalled();
  }, 5000);

  it('reports permission-denied when a guard refuses and the browser stayed elsewhere', async () => {
    router.navigateByUrl.mockResolvedValue(false);
    router.url = '/workplace/dashboard';

    const result = await service.navigateAndScroll('/workplace/settings', 'llm-provider');

    expect(result.success).toBe(false);
    expect(result.reason).toBe(NAVIGATION_REASON_PERMISSION_DENIED);
    expect(telemetry.trackTargetMiss).toHaveBeenCalled();
  });

  it('does not wait for a target when the navigation was refused', async () => {
    router.navigateByUrl.mockResolvedValue(false);
    router.url = '/workplace/dashboard';

    const result = await service.navigateAndScroll('/workplace/settings', 'nonexistent');

    expect(result.reason).toBe(NAVIGATION_REASON_PERMISSION_DENIED);
  });

  it('reports feature-disabled when the guard refused because the feature is not activated', async () => {
    // The guard records the reason synchronously before it returns false, so it is already there
    // when navigateByUrl resolves - this is what separates a disabled plugin from a missing right.
    router.navigateByUrl.mockImplementation(() => {
      noAccessReason.set(NO_ACCESS_REASON_FEATURE);
      return Promise.resolve(false);
    });
    router.url = '/workplace/dashboard';

    const result = await service.navigateAndScroll('/workplace/messaging');

    expect(result.success).toBe(false);
    expect(result.reason).toBe(NAVIGATION_REASON_FEATURE_DISABLED);
  });

  it('reports permission-denied when the guard recorded a missing right', async () => {
    router.navigateByUrl.mockImplementation(() => {
      noAccessReason.set(NO_ACCESS_REASON_PERMISSION);
      return Promise.resolve(false);
    });
    router.url = '/workplace/dashboard';

    const result = await service.navigateAndScroll('/workplace/settings');

    expect(result.reason).toBe(NAVIGATION_REASON_PERMISSION_DENIED);
  });

  it('falls back to permission-denied when no guard recorded a reason', async () => {
    router.navigateByUrl.mockResolvedValue(false);
    router.url = '/workplace/dashboard';

    const result = await service.navigateAndScroll('/workplace/settings');

    expect(result.reason).toBe(NAVIGATION_REASON_PERMISSION_DENIED);
  });

  it('never blames a navigation for a feature reason left over from an earlier refusal', async () => {
    // The user walked into /workplace/messaging on their own and was refused; the stale reason must
    // not turn the next unrelated refusal into a "feature not activated" claim.
    noAccessReason.set(NO_ACCESS_REASON_FEATURE);
    router.navigateByUrl.mockResolvedValue(false);
    router.url = '/workplace/dashboard';

    const result = await service.navigateAndScroll('/workplace/settings');

    expect(result.reason).toBe(NAVIGATION_REASON_PERMISSION_DENIED);
  });

  it('clears a pending reason even when the navigation succeeds', async () => {
    noAccessReason.set(NO_ACCESS_REASON_FEATURE);
    router.navigateByUrl.mockResolvedValue(true);
    router.url = '/workplace/settings';

    await service.navigateAndScroll('/workplace/settings');

    expect(noAccessReason.consume()).toBeNull();
  });

  it('still scrolls when the router skipped the navigation because the page is already open', async () => {
    // onSameUrlNavigation defaults to 'ignore', so navigateByUrl resolves false here - claiming a
    // rights problem would be a fresh false statement, and the scroll would never happen.
    router.navigateByUrl.mockResolvedValue(false);
    router.url = '/workplace/settings';
    const el = document.createElement('div');
    el.setAttribute('data-klacksy-target', 'erp-drop-points');
    el.scrollIntoView = vi.fn();
    document.body.appendChild(el);

    const result = await service.navigateAndScroll('/workplace/settings', 'erp-drop-points');

    expect(result.success).toBe(true);
    expect(el.classList.contains('klacksy-highlight')).toBe(true);
  });

  it('ignores the query string when deciding whether the page is already open', async () => {
    router.navigateByUrl.mockResolvedValue(false);
    router.url = '/workplace/schedule?groupId=abc-123';

    const result = await service.navigateAndScroll('/workplace/schedule?groupId=abc-123');

    expect(result.success).toBe(true);
  });

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

  describe('explain scroll queue', () => {
    const createTarget = (id: string): HTMLElement => {
      const el = document.createElement('div');
      el.setAttribute('data-klacksy-target', id);
      el.scrollIntoView = vi.fn();
      document.body.appendChild(el);
      return el;
    };

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('scrolls to a target on the current page without navigating', async () => {
      const el = createTarget('settings-general');
      vi.useRealTimers();
      const result = await service.scrollToTargetOnPage('settings-general');
      expect(result.success).toBe(true);
      expect(el.classList.contains('klacksy-highlight')).toBe(true);
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('reports a miss when the target is absent', async () => {
      const pending = service.scrollToTargetOnPage('does-not-exist');
      await vi.advanceTimersByTimeAsync(2000);
      const result = await pending;
      expect(result).toEqual({ success: false, reason: 'target-not-found' });
      expect(telemetry.trackTargetMiss).toHaveBeenCalled();
    });

    it('spaces queued explain scrolls so each highlight stays visible', async () => {
      const first = createTarget('settings-general');
      const second = createTarget('owner-address');

      service.queueExplainScroll('settings-general');
      service.queueExplainScroll('owner-address');
      await vi.advanceTimersByTimeAsync(0);

      expect(first.classList.contains('klacksy-highlight')).toBe(true);
      expect(second.classList.contains('klacksy-highlight')).toBe(false);

      await vi.advanceTimersByTimeAsync(1800);
      expect(second.classList.contains('klacksy-highlight')).toBe(true);
    });

    it('clearExplainScrollQueue drops pending scrolls', async () => {
      createTarget('settings-general');
      const second = createTarget('owner-address');

      service.queueExplainScroll('settings-general');
      service.queueExplainScroll('owner-address');
      await vi.advanceTimersByTimeAsync(0);
      service.clearExplainScrollQueue();

      await vi.advanceTimersByTimeAsync(4000);
      expect(second.classList.contains('klacksy-highlight')).toBe(false);
    });
  });
});
