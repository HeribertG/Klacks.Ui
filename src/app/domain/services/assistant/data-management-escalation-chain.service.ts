// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * State + actions for the escalation intervention list: the running-chain count feeds the header
 * badge, the full list feeds the dedicated page. The list is open to every signed-in planner, so the
 * refresh load is bounded: a woken planner is refreshed at once by the existing per-user pushes - the stage alert
 * itself arrives as a ProactiveMessage of kind escalation_stage_alert (live push of the wake-up; other kinds are ignored), later hand-off and close-out notes as
 * ProactiveInboxChanged - and the periodic poll is only a fallback: every minute for administrators (who watch every
 * chain and are rarely the woken one), every five minutes for everybody else. The first successful permission check
 * polls at once, whatever the tick, so rights that arrive after login do not delay the first load. A stage's
 * shortest window is 5 minutes (ESCALATION_STAGE_MIN_MINUTES), so the slower fallback never misses a whole stage.
 * Polling needs the CanViewSchedule right.
 */

import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Observable, Subject, filter, merge, tap, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DataEscalationChainService } from 'src/app/infrastructure/api/assistant/data-escalation-chain.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS, ROLE_ADMIN } from 'src/app/domain/constants/permissions.constants';
import { PROACTIVE_TRIGGER_KIND } from 'src/app/domain/constants/proactive-trigger-kinds.constants';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import {
  IEscalationAcknowledgeResult,
  IEscalationChainSummary,
} from 'src/app/domain/interfaces/escalation-chain.interface';

const ADMIN_POLL_INTERVAL_MS = 60000;
const PLANNER_POLL_INTERVAL_MS = 300000;

@Injectable({ providedIn: 'root' })
export class DataManagementEscalationChainService implements OnDestroy {
  private dataService = inject(DataEscalationChainService);
  private authorizationService = inject(AuthorizationService);
  private signalRService = inject(AssistantSignalRService);

  private readonly destroy$ = new Subject<void>();
  private polledOnce = false;

  public readonly runningChains = signal<IEscalationChainSummary[]>([]);
  public readonly runningCount = computed(() => this.runningChains().length);
  public readonly hasRunning = computed(() => this.runningCount() > 0);

  constructor() {
    timer(0, ADMIN_POLL_INTERVAL_MS)
      .pipe(
        filter((tick) => this.shouldPoll(tick)),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.polledOnce = true;
        this.refresh();
      });

    const stageAlerts$ = this.signalRService.proactiveMessage$.pipe(
      filter((message) => message.kind === PROACTIVE_TRIGGER_KIND.EscalationStageAlert),
    );

    merge(this.signalRService.proactiveInboxChanged$, stageAlerts$)
      .pipe(
        filter(() => this.authorizationService.hasPermission(PERMISSIONS.CanViewSchedule)),
        takeUntil(this.destroy$),
      )
      .subscribe(() => this.refresh());
  }

  private shouldPoll(tick: number): boolean {
    if (!this.authorizationService.hasPermission(PERMISSIONS.CanViewSchedule)) {
      return false;
    }

    if (!this.polledOnce || this.authorizationService.hasPermission(ROLE_ADMIN)) {
      return true;
    }

    return tick % (PLANNER_POLL_INTERVAL_MS / ADMIN_POLL_INTERVAL_MS) === 0;
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

  acknowledge(chainId: string): Observable<IEscalationAcknowledgeResult> {
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
