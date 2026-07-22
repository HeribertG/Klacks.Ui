// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { runInInjectionContext, Injector, signal } from '@angular/core';
import { PlanExecutionPanelComponent } from './plan-execution-panel.component';
import { DataManagementAgentPlanService } from 'src/app/domain/services/assistant/data-management-agent-plan.service';
import {
  IAgentPlan,
  IAgentPlanStep,
  PlanStatus,
  PlanStatusValue,
} from 'src/app/domain/models/assistant/agent-plan.interface';

describe('PlanExecutionPanelComponent', () => {
  function makePlan(status: PlanStatusValue = PlanStatus.Executing, currentStepIndex = 1): IAgentPlan {
    const steps: IAgentPlanStep[] = [
      { order: 1, skill: 'create_employee', params: {}, reversible: true },
      { order: 2, skill: 'assign_contract_to_client', params: {}, reversible: true },
      { order: 3, skill: 'add_client_to_group', params: {}, reversible: false },
    ];
    return {
      id: 'plan-1',
      agentId: 'agent-1',
      userId: 'user-1',
      goal: 'onboard Max Müller',
      stepsJson: JSON.stringify(steps),
      status,
      currentStepIndex,
    };
  }

  function setupComponent(
    plan: IAgentPlan | null,
    options?: { isApproving?: boolean; isAborting?: boolean },
  ): PlanExecutionPanelComponent {
    const activePlan = signal(plan);
    const totalSteps = signal(plan ? (JSON.parse(plan.stepsJson) as unknown[]).length : 0);
    const steps = signal<IAgentPlanStep[]>(plan ? (JSON.parse(plan.stepsJson) as IAgentPlanStep[]) : []);
    const isPaused = signal(plan?.status === PlanStatus.PausedForApproval);
    const isExecuting = signal(plan?.status === PlanStatus.Executing);
    const isCompleted = signal(plan?.status === PlanStatus.Completed);
    const isFailed = signal(plan?.status === PlanStatus.Failed);
    const isApproving = signal(options?.isApproving ?? false);
    const isAborting = signal(options?.isAborting ?? false);

    const serviceMock: Partial<DataManagementAgentPlanService> = {
      activePlan,
      totalSteps,
      steps,
      isPausedForApproval: isPaused,
      isExecuting,
      isCompleted,
      isFailed,
      isApproving,
      isAborting,
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DataManagementAgentPlanService, useValue: serviceMock },
      ],
    });

    const injector = TestBed.inject(Injector);
    return runInInjectionContext(injector, () => new PlanExecutionPanelComponent());
  }

  it('renders rows with done/running/pending statuses based on currentStepIndex', () => {
    const component = setupComponent(makePlan(PlanStatus.Executing, 1));

    const rows = component.rows();
    expect(rows).toHaveLength(3);
    expect(rows[0].status).toBe('done');
    expect(rows[1].status).toBe('running');
    expect(rows[2].status).toBe('pending');
  });

  it('marks the paused step as paused', () => {
    const component = setupComponent(makePlan(PlanStatus.PausedForApproval, 2));

    const rows = component.rows();
    expect(rows[2].status).toBe('paused');
  });

  it('marks all rows up to current as done when plan is completed', () => {
    const component = setupComponent(makePlan(PlanStatus.Completed, 3));

    const rows = component.rows();
    expect(rows.every((r) => r.status === 'done')).toBe(true);
  });

  it('emits approveRequested when Approve clicked while paused', () => {
    const component = setupComponent(makePlan(PlanStatus.PausedForApproval, 2));

    let emitted: string | undefined;
    component.approveRequested.subscribe((id: string) => (emitted = id));
    component.onApproveClick();

    expect(emitted).toBe('plan-1');
  });

  it('does not emit approveRequested when not paused', () => {
    const component = setupComponent(makePlan(PlanStatus.Executing, 1));

    let emitted: string | undefined;
    component.approveRequested.subscribe((id: string) => (emitted = id));
    component.onApproveClick();

    expect(emitted).toBeUndefined();
  });

  it('allows abort while executing', () => {
    const component = setupComponent(makePlan(PlanStatus.Executing, 1));

    expect(component.canAbort()).toBe(true);
  });

  it('allows abort while paused for approval', () => {
    const component = setupComponent(makePlan(PlanStatus.PausedForApproval, 1));

    expect(component.canAbort()).toBe(true);
  });

  it('does not allow abort once completed', () => {
    const component = setupComponent(makePlan(PlanStatus.Completed, 3));

    expect(component.canAbort()).toBe(false);
  });

  it('emits abortRequested when Abort clicked while executing', () => {
    const component = setupComponent(makePlan(PlanStatus.Executing, 1));

    let emitted: string | undefined;
    component.abortRequested.subscribe((id: string) => (emitted = id));
    component.onAbortClick();

    expect(emitted).toBe('plan-1');
  });

  it('does not emit abortRequested when plan is already completed', () => {
    const component = setupComponent(makePlan(PlanStatus.Completed, 3));

    let emitted: string | undefined;
    component.abortRequested.subscribe((id: string) => (emitted = id));
    component.onAbortClick();

    expect(emitted).toBeUndefined();
  });

  it('does not emit approveRequested while a request is already in flight', () => {
    const component = setupComponent(makePlan(PlanStatus.PausedForApproval, 1), { isApproving: true });

    let emitted: string | undefined;
    component.approveRequested.subscribe((id: string) => (emitted = id));
    component.onApproveClick();

    expect(emitted).toBeUndefined();
  });

  it('does not emit abortRequested while a request is already in flight', () => {
    const component = setupComponent(makePlan(PlanStatus.Executing, 1), { isAborting: true });

    let emitted: string | undefined;
    component.abortRequested.subscribe((id: string) => (emitted = id));
    component.onAbortClick();

    expect(emitted).toBeUndefined();
  });

  it('builds the status label key from the plan status', () => {
    const component = setupComponent(makePlan(PlanStatus.PausedForApproval, 1));

    expect(component.statusLabelKey(PlanStatus.PausedForApproval)).toBe(
      'assistant-chat.plan-execution.status.paused_for_approval',
    );
  });
});
