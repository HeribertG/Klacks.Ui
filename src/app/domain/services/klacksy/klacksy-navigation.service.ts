// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Klacksy navigation + in-page scroll service. Also pulses main-nav icons so Klacksy
 * can show the user which icon opens a page (highlightNavIcon); every navigateAndScroll
 * pulses the destination page's nav icon as a side effect. Shell targets on the global route
 * (KLACKSY_GLOBAL_TARGET_ROUTE) are highlighted in place, without any navigation.
 * @param route - destination Angular route
 * @param target - optional data-klacksy-target ID
 * @param elementId - DOM id of a main-nav icon (e.g. 'open-settings')
 */
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { resolveNavIconsForRoute } from 'src/app/domain/constants/route-nav-icons.constants';
import { KlacksyTelemetryService } from './klacksy-telemetry.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import {
  NAVIGATION_REASON_PERMISSION_DENIED,
  NAVIGATION_REASON_TARGET_NOT_FOUND,
} from 'src/app/domain/constants/navigation-outcome.constants';
import { KLACKSY_GLOBAL_TARGET_ROUTE } from 'src/app/domain/constants/klacksy-global-target.constants';

export interface NavigationResult {
  success: boolean;
  reason?: typeof NAVIGATION_REASON_TARGET_NOT_FOUND | typeof NAVIGATION_REASON_PERMISSION_DENIED;
}

@Injectable({ providedIn: 'root' })
export class KlacksyNavigationService {
  private readonly router = inject(Router);
  private readonly telemetry = inject(KlacksyTelemetryService);
  private readonly eventBus = inject(EVENT_BUS_TOKEN);
  // Worst-case wait until we conclude the target marker is missing. The
  // MutationObserver resolves immediately the moment the element appears, so
  // this timeout only fires when the target is genuinely absent. 1500 ms keeps
  // the "target-not-found" feedback snappy without breaking slow lazy routes.
  private static readonly WAIT_MS = 1500;
  // Valid unescaped CSS id selector: letters/digits/hyphens/underscores, not starting
  // with a digit or a lone hyphen followed by a digit.
  private static readonly SAFE_ID_PATTERN = /^-?[A-Za-z_][A-Za-z0-9_-]*$/;
  private static readonly HIGHLIGHT_MS = 5000;
  private static readonly HIGHLIGHT_CLASS = 'klacksy-highlight';
  private static readonly ICON_HIGHLIGHT_CLASS = 'klacksy-highlight-icon';
  private static readonly FOCUSABLE_SELECTOR = 'input, select, textarea, button, [tabindex]:not([tabindex="-1"])';
  // Async sibling cards (settings sections, contracts/groups/qualifications/notes)
  // keep growing the scroll container long after the target marker exists in the
  // DOM, and response bursts are separated by quiet gaps — so any "wait until the
  // height settles, then scroll once" heuristic either fires too early or delays
  // the scroll. Instead: scroll immediately, then re-anchor the target whenever
  // the container height changes, until the window elapses or the user scrolls.
  private static readonly ANCHOR_POLL_MS = 100;
  private static readonly ANCHOR_MAX_MS = 5000;
  private static readonly ANCHOR_CANCEL_EVENTS = ['wheel', 'touchstart', 'mousedown'] as const;
  // Streamed [SCROLL:...] markers can arrive faster than a reader follows the page;
  // spacing the jumps keeps each highlighted section visible for a moment.
  private static readonly EXPLAIN_SCROLL_INTERVAL_MS = 1800;

  private explainScrollQueue: string[] = [];
  private explainScrollTimer: ReturnType<typeof setTimeout> | null = null;

  async navigateAndScroll(route: string, target?: string): Promise<NavigationResult> {
    if (route === KLACKSY_GLOBAL_TARGET_ROUTE) {
      return target ? this.highlightGlobalTarget(target) : { success: true };
    }

    // navigateByUrl resolves false for a rejected guard, but just as well for the far more common
    // "already on this route" skip (onSameUrlNavigation defaults to 'ignore'), and Klacksy is
    // regularly asked to point at a spot on the page the user is already looking at. Only the
    // router's own url tells the two apart: standing on the requested page is a success no matter
    // what the boolean said, and the scroll must still happen.
    const navigated = await this.router.navigateByUrl(route);
    if (!navigated && !this.isOnRoute(route)) {
      this.telemetry.trackTargetMiss(route, target ?? '');
      return { success: false, reason: NAVIGATION_REASON_PERMISSION_DENIED };
    }

    this.pulseNavIconForRoute(route);
    if (!target) return { success: true };

    const el = await this.waitForElement(target, KlacksyNavigationService.WAIT_MS);
    if (!el) {
      this.telemetry.trackTargetMiss(route, target);
      return { success: false, reason: NAVIGATION_REASON_TARGET_NOT_FOUND };
    }

    this.scrollTargetIntoView(el);
    el.classList.add('klacksy-highlight');
    setTimeout(() => el.classList.remove('klacksy-highlight'), KlacksyNavigationService.HIGHLIGHT_MS);

    const focusable = el.querySelector<HTMLElement>(KlacksyNavigationService.FOCUSABLE_SELECTOR);
    focusable?.focus({ preventScroll: true });
    void this.keepAnchoredWhileLayoutGrows(el);
    return { success: true };
  }

  // Shell targets (header search, assistant-chat panels) are on screen on every page, so the
  // user stays where they are; the element is only highlighted and focused.
  private async highlightGlobalTarget(target: string): Promise<NavigationResult> {
    const el = await this.waitForElement(target, KlacksyNavigationService.WAIT_MS);
    if (!el) {
      this.telemetry.trackTargetMiss(this.router.url, target);
      return { success: false, reason: NAVIGATION_REASON_TARGET_NOT_FOUND };
    }

    this.scrollTargetIntoView(el);
    el.classList.add(KlacksyNavigationService.HIGHLIGHT_CLASS);
    setTimeout(() => el.classList.remove(KlacksyNavigationService.HIGHLIGHT_CLASS), KlacksyNavigationService.HIGHLIGHT_MS);
    el.querySelector<HTMLElement>(KlacksyNavigationService.FOCUSABLE_SELECTOR)?.focus({ preventScroll: true });
    return { success: true };
  }

  queueExplainScroll(target: string): void {
    this.explainScrollQueue.push(target);
    if (this.explainScrollTimer === null) {
      this.drainExplainScrollQueue();
    }
  }

  clearExplainScrollQueue(): void {
    this.explainScrollQueue = [];
    if (this.explainScrollTimer !== null) {
      clearTimeout(this.explainScrollTimer);
      this.explainScrollTimer = null;
    }
  }

  private drainExplainScrollQueue(): void {
    const target = this.explainScrollQueue.shift();
    if (target === undefined) {
      this.explainScrollTimer = null;
      return;
    }
    void this.scrollToTargetOnPage(target);
    this.explainScrollTimer = setTimeout(
      () => this.drainExplainScrollQueue(),
      KlacksyNavigationService.EXPLAIN_SCROLL_INTERVAL_MS
    );
  }

  // Scrolls to a target on the CURRENT page without navigating — used while a streamed
  // explanation walks through the page section by section. No layout re-anchoring here:
  // the next queued section would fight the previous target's re-anchor loop.
  async scrollToTargetOnPage(target: string): Promise<NavigationResult> {
    const el = await this.waitForElement(target, KlacksyNavigationService.WAIT_MS);
    if (!el) {
      this.telemetry.trackTargetMiss(this.router.url, target);
      return { success: false, reason: NAVIGATION_REASON_TARGET_NOT_FOUND };
    }

    this.scrollTargetIntoView(el);
    el.classList.add(KlacksyNavigationService.HIGHLIGHT_CLASS);
    setTimeout(() => el.classList.remove(KlacksyNavigationService.HIGHLIGHT_CLASS), KlacksyNavigationService.HIGHLIGHT_MS);
    return { success: true };
  }

  highlightNavIcon(elementId: string): boolean {
    const el = document.getElementById(elementId);
    if (!el) {
      this.telemetry.trackTargetMiss('main-nav', elementId);
      return false;
    }

    el.classList.add(KlacksyNavigationService.HIGHLIGHT_CLASS, KlacksyNavigationService.ICON_HIGHLIGHT_CLASS);
    setTimeout(
      () => el.classList.remove(KlacksyNavigationService.HIGHLIGHT_CLASS, KlacksyNavigationService.ICON_HIGHLIGHT_CLASS),
      KlacksyNavigationService.HIGHLIGHT_MS
    );
    return true;
  }

  private isOnRoute(route: string): boolean {
    return this.stripQuery(this.router.url) === this.stripQuery(route);
  }

  private stripQuery(url: string): string {
    return url.split('?')[0].split('#')[0];
  }

  private pulseNavIconForRoute(route: string): void {
    const candidates = resolveNavIconsForRoute(route);
    if (!candidates) return;

    for (const elementId of candidates) {
      if (this.highlightNavIcon(elementId)) return;
    }
  }

  private findScrollableAncestor(el: Element): HTMLElement | null {
    let node = el.parentElement;
    while (node) {
      const overflowY = getComputedStyle(node).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') return node;
      node = node.parentElement;
    }
    return null;
  }

  // Native el.scrollIntoView() walks every ancestor scroll container, including
  // ones with overflow:hidden (e.g. the app shell's #main_container) — CSS still
  // allows scrolling those programmatically, which clips the fixed header/footer
  // out of view. Scrolling only the nearest auto/scroll ancestor keeps the shell put.
  private scrollTargetIntoView(el: Element): void {
    const container = this.findScrollableAncestor(el);
    if (!container) {
      el.scrollIntoView({ behavior: 'auto', block: 'start' });
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    container.scrollTop += elRect.top - containerRect.top;
  }

  private async keepAnchoredWhileLayoutGrows(el: Element): Promise<void> {
    const container = this.findScrollableAncestor(el) ?? document.scrollingElement;
    if (!container) return;

    let cancelled = false;
    const cancel = (): void => {
      cancelled = true;
    };
    KlacksyNavigationService.ANCHOR_CANCEL_EVENTS.forEach((event) =>
      window.addEventListener(event, cancel, { passive: true })
    );

    try {
      let lastHeight = container.scrollHeight;
      const start = performance.now();
      while (!cancelled && performance.now() - start < KlacksyNavigationService.ANCHOR_MAX_MS) {
        await new Promise<void>((resolve) => setTimeout(resolve, KlacksyNavigationService.ANCHOR_POLL_MS));
        if (cancelled || !el.isConnected) return;
        const height = container.scrollHeight;
        if (height !== lastHeight) {
          lastHeight = height;
          this.scrollTargetIntoView(el);
        }
      }
    } finally {
      KlacksyNavigationService.ANCHOR_CANCEL_EVENTS.forEach((event) =>
        window.removeEventListener(event, cancel)
      );
    }
  }

  // Knowledge docs and the UI_ELEMENT_MAP seed hand the model plain DOM ids (e.g.
  // "erp-drop-points-upload-zone") that were never wired up as a data-klacksy-target
  // attribute. The attribute stays authoritative when both exist; the id is only a
  // fallback, and both are tried inside the same MutationObserver window rather than
  // two sequential timeouts.
  private waitForElement(target: string, timeoutMs: number): Promise<Element | null> {
    this.eventBus.emit(DomainEventType.KLACKSY_TARGET_REQUESTED, { target });
    return new Promise((resolve) => {
      const existing = this.findTargetElement(target);
      if (existing) return resolve(existing);
      const observer = new MutationObserver(() => {
        const el = this.findTargetElement(target);
        if (el) { observer.disconnect(); resolve(el); }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { observer.disconnect(); resolve(null); }, timeoutMs);
    });
  }

  private findTargetElement(target: string): Element | null {
    return this.queryTargetAttribute(target) ?? this.queryTargetId(target);
  }

  private queryTargetAttribute(target: string): Element | null {
    try {
      return document.querySelector(`[data-klacksy-target="${target}"]`);
    } catch {
      return null;
    }
  }

  // The target string is model- or knowledge-doc-supplied and untrusted as a selector:
  // a leading digit, a dot or a colon would make `#${target}` throw. Real DOM ids in this
  // codebase are plain CSS identifiers (kebab-case, no dot/colon), so requiring that shape
  // before building the selector is both correct and simpler than CSS.escape() - which
  // jsdom (used by the unit tests) does not implement as a global at all. The try/catch
  // stays as a last-resort net so a malformed target is a plain miss, never a thrown error.
  private queryTargetId(target: string): Element | null {
    if (!KlacksyNavigationService.SAFE_ID_PATTERN.test(target)) return null;
    try {
      return document.querySelector(`#${target}`);
    } catch {
      return null;
    }
  }
}
