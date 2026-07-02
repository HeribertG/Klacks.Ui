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
  // Async sibling cards (contracts/groups/qualifications/notes/image) keep growing
  // the scroll container's height well after the target marker itself already
  // exists in the DOM. Poll until the container's height stops changing before
  // scrolling, otherwise scrollIntoView fires against a not-yet-final layout and
  // under-shoots (a single-shot scroll never re-runs once the page keeps growing).
  private static readonly SETTLE_POLL_MS = 100;
  private static readonly SETTLE_MAX_MS = 1500;
  private static readonly SETTLE_STABLE_ROUNDS = 2;

  async navigateAndScroll(route: string, target?: string): Promise<NavigationResult> {
    await this.router.navigateByUrl(route);
    this.pulseNavIconForRoute(route);
    if (!target) return { success: true };

    const el = await this.waitForElement(`[data-klacksy-target="${target}"]`, KlacksyNavigationService.WAIT_MS);
    if (!el) {
      this.telemetry.trackTargetMiss(route, target);
      return { success: false, reason: 'target-not-found' };
    }

    await this.waitForLayoutSettle(this.findScrollableAncestor(el));
    el.scrollIntoView({ behavior: 'auto', block: 'start' });
    el.classList.add('klacksy-highlight');
    setTimeout(() => el.classList.remove('klacksy-highlight'), KlacksyNavigationService.HIGHLIGHT_MS);

    const focusable = el.querySelector<HTMLElement>('input, select, textarea, button, [tabindex]:not([tabindex="-1"])');
    focusable?.focus();
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

  private async waitForLayoutSettle(container: HTMLElement | null): Promise<void> {
    if (!container) return;
    let lastHeight = container.scrollHeight;
    let stableRounds = 0;
    const start = performance.now();
    while (performance.now() - start < KlacksyNavigationService.SETTLE_MAX_MS) {
      await new Promise<void>((resolve) => setTimeout(resolve, KlacksyNavigationService.SETTLE_POLL_MS));
      const height = container.scrollHeight;
      if (height === lastHeight) {
        stableRounds++;
        if (stableRounds >= KlacksyNavigationService.SETTLE_STABLE_ROUNDS) return;
      } else {
        stableRounds = 0;
        lastHeight = height;
      }
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
