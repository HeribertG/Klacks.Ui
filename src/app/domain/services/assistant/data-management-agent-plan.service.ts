// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * State + actions for Klacksy AgentPlans (Phase 3 autonomy roadmap).
 * Exposes an activePlan signal with totalSteps derived from stepsJson, subscribes to
 * SignalR PlanUpdated events to keep status + currentStepIndex live, and offers
 * methods to create, approve, list, and select plans.
 * @param dataAgentPlanService - HTTP API
 * @param signalRService - assistant SignalR connection for live plan updates
 */

import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Observable, Subject, tap } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DataAgentPlanService, ICreatePlanRequest } from 'src/app/infrastructure/api/assistant/data-agent-plan.service';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import {
  IAgentPlan,
  IAgentPlanStep,
  IAgentPlanUpdate,
  PlanStatus,
} from 'src/app/domain/models/assistant/agent-plan.interface';

@Injectable({ providedIn: 'root' })
export class DataManagementAgentPlanService implements OnDestroy {
  private dataAgentPlanService = inject(DataAgentPlanService);
  private signalRService = inject(AssistantSignalRService);

  private readonly destroy$ = new Subject<void>();

  public readonly activePlan = signal<IAgentPlan | null>(null);
  public readonly totalSteps = signal<number>(0);
  public readonly isLoading = signal<boolean>(false);

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
    return this.dataAgentPlanService.approve(planId).pipe(
      tap((plan) => this.activePlan.set(plan)),
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

  clearActivePlan(): void {
    this.activePlan.set(null);
    this.totalSteps.set(0);
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
