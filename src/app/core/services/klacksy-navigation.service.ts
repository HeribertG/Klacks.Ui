// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Klacksy navigation + in-page scroll service.
 * @param route - destination Angular route
 * @param target - optional data-klacksy-target ID
 */
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { KlacksyTelemetryService } from './klacksy-telemetry.service';

export interface NavigationResult {
  success: boolean;
  reason?: 'target-not-found' | 'permission-denied';
}

@Injectable({ providedIn: 'root' })
export class KlacksyNavigationService {
  private readonly router = inject(Router);
  private readonly telemetry = inject(KlacksyTelemetryService);
  private static readonly WAIT_MS = 3000;
  private static readonly HIGHLIGHT_MS = 2000;

  async navigateAndScroll(route: string, target?: string): Promise<NavigationResult> {
    await this.router.navigateByUrl(route);
    if (!target) return { success: true };

    const el = await this.waitForElement(`[data-klacksy-target="${target}"]`, KlacksyNavigationService.WAIT_MS);
    if (!el) {
      this.telemetry.trackTargetMiss(route, target);
      return { success: false, reason: 'target-not-found' };
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('klacksy-highlight');
    setTimeout(() => el.classList.remove('klacksy-highlight'), KlacksyNavigationService.HIGHLIGHT_MS);

    const focusable = el.querySelector<HTMLElement>('input, select, textarea, button, [tabindex]:not([tabindex="-1"])');
    focusable?.focus();
    return { success: true };
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
