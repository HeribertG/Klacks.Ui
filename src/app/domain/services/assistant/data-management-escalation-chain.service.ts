// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * State + actions for the escalation intervention list: the running-chain count feeds the header
 * badge, the full list feeds the dedicated page. Polled rather than SignalR-pushed - a stage's
 * shortest window is 5 minutes (ESCALATION_STAGE_MIN_MINUTES), so a periodic refresh is fresh
 * enough without a dedicated push channel. Polling is gated on admin status so a non-admin session
 * never calls the (admin-only) endpoint.
 */

import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Observable, Subject, filter, tap, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DataEscalationChainService } from 'src/app/infrastructure/api/assistant/data-escalation-chain.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { IEscalationChainSummary } from 'src/app/domain/interfaces/escalation-chain.interface';

const POLL_INTERVAL_MS = 60000;

@Injectable({ providedIn: 'root' })
export class DataManagementEscalationChainService implements OnDestroy {
  private dataService = inject(DataEscalationChainService);
  private authorizationService = inject(AuthorizationService);

  private readonly destroy$ = new Subject<void>();

  public readonly runningChains = signal<IEscalationChainSummary[]>([]);
  public readonly runningCount = computed(() => this.runningChains().length);
  public readonly hasRunning = computed(() => this.runningCount() > 0);

  constructor() {
    timer(0, POLL_INTERVAL_MS)
      .pipe(
        filter(() => this.authorizationService.isAdmin),
        takeUntil(this.destroy$),
      )
      .subscribe(() => this.refresh());
  }

  refresh(): void {
    this.dataService
      .getRunning()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chains) => this.runningChains.set(chains),
        error: () => undefined,
      });
  }

  acknowledge(chainId: string): Observable<void> {
    return this.dataService.acknowledge(chainId).pipe(tap(() => this.refresh()));
  }

  cancel(chainId: string, reason: string): Observable<void> {
    return this.dataService.cancel(chainId, reason).pipe(tap(() => this.refresh()));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
