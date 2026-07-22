// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * State + actions for Klacksy AgentPlans (Phase 3 autonomy roadmap).
 * Exposes an activePlan signal with totalSteps derived from stepsJson, subscribes to
 * SignalR PlanUpdated events to keep status + currentStepIndex live, and offers
 * methods to create, approve, abort, list, and select plans.
 * `hasVisiblePlan` intentionally stays true once a plan reaches a terminal status
 * (completed/aborted/failed) so the panel can still show the outcome: only
 * `refreshActivePlan` (called once per chat-open) filters terminal plans out again.
 * @param dataAgentPlanService - HTTP API
 * @param signalRService - assistant SignalR connection for live plan updates
 */

import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { catchError, map, Observable, Subject, switchMap, tap, throwError } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DataAgentPlanService, ICreatePlanRequest } from 'src/app/infrastructure/api/assistant/data-agent-plan.service';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import {
  IAgentPlan,
  IAgentPlanStep,
  IAgentPlanUpdate,
  PlanStatus,
  PlanStatusValue,
} from 'src/app/domain/models/assistant/agent-plan.interface';

const TERMINAL_PLAN_STATUSES: readonly PlanStatusValue[] = [
  PlanStatus.Completed,
  PlanStatus.Aborted,
  PlanStatus.Failed,
];

@Injectable({ providedIn: 'root' })
export class DataManagementAgentPlanService implements OnDestroy {
  private dataAgentPlanService = inject(DataAgentPlanService);
  private signalRService = inject(AssistantSignalRService);

  private readonly destroy$ = new Subject<void>();

  public readonly activePlan = signal<IAgentPlan | null>(null);
  public readonly totalSteps = signal<number>(0);
  public readonly isLoading = signal<boolean>(false);
  public readonly isApproving = signal<boolean>(false);
  public readonly isAborting = signal<boolean>(false);

  public readonly steps = computed<IAgentPlanStep[]>(() => {
    const plan = this.activePlan();
    if (!plan?.stepsJson) return [];
    try {
      return JSON.parse(plan.stepsJson) as IAgentPlanStep[];
    } catch {
      return [];
    }
  });

  public readonly isPausedForApproval = computed(() => this.activePlan()?.status === PlanStatus.PausedForApproval);
  public readonly isExecuting = computed(() => this.activePlan()?.status === PlanStatus.Executing);
  public readonly isCompleted = computed(() => this.activePlan()?.status === PlanStatus.Completed);
  public readonly isFailed = computed(() => this.activePlan()?.status === PlanStatus.Failed);
  public readonly hasVisiblePlan = computed(() => this.activePlan() !== null);

  constructor() {
    this.signalRService.planUpdated$
      .pipe(takeUntil(this.destroy$))
      .subscribe((update) => this.applyUpdate(update));
  }

  createAndStart(request: ICreatePlanRequest): Observable<IAgentPlan> {
    this.isLoading.set(true);
    return this.dataAgentPlanService.createAndStart(request).pipe(
      tap((plan) => {
        this.activePlan.set(plan);
        this.totalSteps.set(this.parseStepCount(plan.stepsJson));
        this.isLoading.set(false);
      }),
    );
  }

  approve(planId: string): Observable<IAgentPlan> {
    this.isApproving.set(true);
    return this.dataAgentPlanService.approve(planId).pipe(
      tap((plan) => {
        this.activePlan.set(plan);
        this.isApproving.set(false);
      }),
      catchError((error: unknown) => this.recoverAfterConflict(planId, error, this.isApproving)),
    );
  }

  abort(planId: string): Observable<IAgentPlan> {
    this.isAborting.set(true);
    return this.dataAgentPlanService.abort(planId).pipe(
      tap((plan) => {
        this.activePlan.set(plan);
        this.isAborting.set(false);
      }),
      catchError((error: unknown) => this.recoverAfterConflict(planId, error, this.isAborting)),
    );
  }

  listMyPlans(): Observable<IAgentPlan[]> {
    return this.dataAgentPlanService.listMyPlans();
  }

  selectPlan(planId: string): Observable<IAgentPlan> {
    return this.dataAgentPlanService.getPlan(planId).pipe(
      tap((plan) => {
        this.activePlan.set(plan);
        this.totalSteps.set(this.parseStepCount(plan.stepsJson));
      }),
    );
  }

  refreshActivePlan(): Observable<IAgentPlan | null> {
    return this.dataAgentPlanService.listMyPlans().pipe(
      map((plans) => plans.find((plan) => !TERMINAL_PLAN_STATUSES.includes(plan.status)) ?? null),
      tap((active) => {
        this.activePlan.set(active);
        this.totalSteps.set(active ? this.parseStepCount(active.stepsJson) : 0);
      }),
    );
  }

  clearActivePlan(): void {
    this.activePlan.set(null);
    this.totalSteps.set(0);
  }

  private recoverAfterConflict(
    planId: string,
    error: unknown,
    requestFlag: ReturnType<typeof signal<boolean>>,
  ): Observable<IAgentPlan> {
    requestFlag.set(false);
    if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.Conflict) {
      return this.selectPlan(planId).pipe(switchMap(() => throwError(() => error)));
    }
    return throwError(() => error);
  }

  private applyUpdate(update: IAgentPlanUpdate): void {
    const current = this.activePlan();
    if (!current || current.id !== update.planId) return;

    this.activePlan.set({
      ...current,
      status: update.status,
      currentStepIndex: update.currentStepIndex,
      lastErrorMessage: update.lastErrorMessage ?? null,
    });
    if (update.totalSteps > 0) {
      this.totalSteps.set(update.totalSteps);
    }
  }

  private parseStepCount(stepsJson: string): number {
    if (!stepsJson) return 0;
    try {
      const parsed = JSON.parse(stepsJson) as IAgentPlanStep[];
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
