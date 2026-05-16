// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Per-turn UI state Klacksy needs to resolve "this group / this period / this client"
 * without asking the user back. Route is read from Angular's Router; other fields are
 * pushed in by page-level services (e.g. schedule page on mount) via setters.
 * @param router - Angular Router used to read the current URL each turn
 */

import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IAssistantPageContext } from 'src/app/domain/models/assistant/assistant-page-context.interface';

@Injectable({ providedIn: 'root' })
export class AssistantPageContextService {
  private router = inject(Router);

  private readonly selectedGroupId = signal<string | undefined>(undefined);
  private readonly selectedPeriodFrom = signal<string | undefined>(undefined);
  private readonly selectedPeriodUntil = signal<string | undefined>(undefined);
  private readonly selectedClientId = signal<string | undefined>(undefined);

  getPageContext(): IAssistantPageContext {
    const ctx: IAssistantPageContext = {};

    const route = this.router?.url;
    if (route && route !== '/') {
      ctx.currentRoute = route;
    }

    const groupId = this.selectedGroupId();
    if (groupId) {
      ctx.selectedGroupId = groupId;
    }

    const from = this.selectedPeriodFrom();
    if (from) {
      ctx.selectedPeriodFrom = from;
    }

    const until = this.selectedPeriodUntil();
    if (until) {
      ctx.selectedPeriodUntil = until;
    }

    const clientId = this.selectedClientId();
    if (clientId) {
      ctx.selectedClientId = clientId;
    }

    return ctx;
  }

  setSelectedGroupId(id: string | undefined): void {
    this.selectedGroupId.set(id || undefined);
  }

  setSelectedPeriod(from: string | undefined, until: string | undefined): void {
    this.selectedPeriodFrom.set(from || undefined);
    this.selectedPeriodUntil.set(until || undefined);
  }

  setSelectedClientId(id: string | undefined): void {
    this.selectedClientId.set(id || undefined);
  }

  reset(): void {
    this.selectedGroupId.set(undefined);
    this.selectedPeriodFrom.set(undefined);
    this.selectedPeriodUntil.set(undefined);
    this.selectedClientId.set(undefined);
  }
}
