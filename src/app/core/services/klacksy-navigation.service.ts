// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Klacksy navigation + in-page scroll service. Also pulses main-nav icons so Klacksy
 * can show the user which icon opens a page (highlightNavIcon); every navigateAndScroll
 * pulses the destination page's nav icon as a side effect.
 * @param route - destination Angular route
 * @param target - optional data-klacksy-target ID
 * @param elementId - DOM id of a main-nav icon (e.g. 'open-settings')
 */
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { resolveNavIconsForRoute } from 'src/app/domain/constants/route-nav-icons.constants';
import { KlacksyTelemetryService } from './klacksy-telemetry.service';

export interface NavigationResult {
  success: boolean;
  reason?: 'target-not-found' | 'permission-denied';
}

@Injectable({ providedIn: 'root' })
export class KlacksyNavigationService {
  private readonly router = inject(Router);
  private readonly telemetry = inject(KlacksyTelemetryService);
  // Worst-case wait until we conclude the target marker is missing. The
  // MutationObserver resolves immediately the moment the element appears, so
  // this timeout only fires when the target is genuinely absent. 1500 ms keeps
  // the "target-not-found" feedback snappy without breaking slow lazy routes.
  private static readonly WAIT_MS = 1500;
  private static readonly HIGHLIGHT_MS = 5000;
  private static readonly HIGHLIGHT_CLASS = 'klacksy-highlight';
  private static readonly ICON_HIGHLIGHT_CLASS = 'klacksy-highlight-icon';
  // Async sibling cards (settings sections, contracts/groups/qualifications/notes)
  // keep growing the scroll container long after the target marker exists in the
  // DOM, and response bursts are separated by quiet gaps — so any "wait until the
  // height settles, then scroll once" heuristic either fires too early or delays
  // the scroll. Instead: scroll immediately, then re-anchor the target whenever
  // the container height changes, until the window elapses or the user scrolls.
  private static readonly ANCHOR_POLL_MS = 100;
  private static readonly ANCHOR_MAX_MS = 5000;
  private static readonly ANCHOR_CANCEL_EVENTS = ['wheel', 'touchstart', 'mousedown'] as const;

  async navigateAndScroll(route: string, target?: string): Promise<NavigationResult> {
    await this.router.navigateByUrl(route);
    this.pulseNavIconForRoute(route);
    if (!target) return { success: true };

    const el = await this.waitForElement(`[data-klacksy-target="${target}"]`, KlacksyNavigationService.WAIT_MS);
    if (!el) {
      this.telemetry.trackTargetMiss(route, target);
      return { success: false, reason: 'target-not-found' };
    }

    this.scrollTargetIntoView(el);
    el.classList.add('klacksy-highlight');
    setTimeout(() => el.classList.remove('klacksy-highlight'), KlacksyNavigationService.HIGHLIGHT_MS);

    const focusable = el.querySelector<HTMLElement>('input, select, textarea, button, [tabindex]:not([tabindex="-1"])');
    focusable?.focus({ preventScroll: true });
    void this.keepAnchoredWhileLayoutGrows(el);
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

  private waitForElement(selector: string, timeoutMs: number): Promise<Element | null> {
    return new Promise((resolve) => {
      const existing = document.querySelector(selector);
      if (existing) return resolve(existing);
      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) { observer.disconnect(); resolve(el); }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { observer.disconnect(); resolve(null); }, timeoutMs);
    });
  }
}
