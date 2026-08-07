// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';

import { DataManagementAgentPlanService } from './data-management-agent-plan.service';
import { DataAgentPlanService } from 'src/app/infrastructure/api/assistant/data-agent-plan.service';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { IAgentPlan, IAgentPlanUpdate, PlanStatus } from 'src/app/domain/models/assistant/agent-plan.interface';

describe('DataManagementAgentPlanService', () => {
  let service: DataManagementAgentPlanService;
  let dataAgentPlanServiceSpy: {
    createAndStart: ReturnType<typeof vi.fn>;
    approve: ReturnType<typeof vi.fn>;
    abort: ReturnType<typeof vi.fn>;
    listMyPlans: ReturnType<typeof vi.fn>;
    getPlan: ReturnType<typeof vi.fn>;
  };
  let planUpdated$: Subject<IAgentPlanUpdate>;

  const makePlan = (overrides: Partial<IAgentPlan> = {}): IAgentPlan => ({
    id: 'plan-1',
    agentId: 'agent-1',
    userId: 'user-1',
    goal: 'onboard Max Müller',
    stepsJson: JSON.stringify([{ order: 1, skill: 'create_employee', params: {}, reversible: true }]),
    status: PlanStatus.Executing,
    currentStepIndex: 0,
    ...overrides,
  });

  beforeEach(() => {
    dataAgentPlanServiceSpy = {
      createAndStart: vi.fn(),
      approve: vi.fn(),
      abort: vi.fn(),
      listMyPlans: vi.fn(),
      getPlan: vi.fn(),
    };
    planUpdated$ = new Subject<IAgentPlanUpdate>();

    TestBed.configureTestingModule({
      providers: [
        { provide: DataAgentPlanService, useValue: dataAgentPlanServiceSpy },
        { provide: AssistantSignalRService, useValue: { planUpdated$ } },
      ],
    });

    service = TestBed.inject(DataManagementAgentPlanService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createAndStart', () => {
    it('sets the active plan and total steps on success', () => {
      const plan = makePlan();
      dataAgentPlanServiceSpy.createAndStart.mockReturnValue(of(plan));

      service.createAndStart({ goal: plan.goal }).subscribe();

      expect(service.activePlan()).toEqual(plan);
      expect(service.totalSteps()).toBe(1);
      expect(service.isLoading()).toBe(false);
    });
  });

  describe('approve', () => {
    it('sets isApproving during the request and clears it on success', () => {
      const plan = makePlan({ status: PlanStatus.Executing, currentStepIndex: 1 });
      dataAgentPlanServiceSpy.approve.mockReturnValue(of(plan));

      service.approve('plan-1').subscribe();

      expect(service.isApproving()).toBe(false);
      expect(service.activePlan()).toEqual(plan);
    });

    it('reloads the plan and rethrows on a 409 conflict', () => {
      const staleConflict = new HttpErrorResponse({ status: 409 });
      const refreshedPlan = makePlan({ status: PlanStatus.Failed });
      dataAgentPlanServiceSpy.approve.mockReturnValue(throwError(() => staleConflict));
      dataAgentPlanServiceSpy.getPlan.mockReturnValue(of(refreshedPlan));

      let caughtError: unknown;
      service.approve('plan-1').subscribe({ error: (err) => (caughtError = err) });

      expect(caughtError).toBe(staleConflict);
      expect(service.activePlan()).toEqual(refreshedPlan);
      expect(service.isApproving()).toBe(false);
    });

    it('rethrows non-conflict errors without reloading', () => {
      const serverError = new HttpErrorResponse({ status: 500 });
      dataAgentPlanServiceSpy.approve.mockReturnValue(throwError(() => serverError));

      let caughtError: unknown;
      service.approve('plan-1').subscribe({ error: (err) => (caughtError = err) });

      expect(caughtError).toBe(serverError);
      expect(dataAgentPlanServiceSpy.getPlan).not.toHaveBeenCalled();
      expect(service.isApproving()).toBe(false);
    });
  });

  describe('abort', () => {
    it('sets isAborting during the request and applies the aborted plan on success', () => {
      const abortedPlan = makePlan({ status: PlanStatus.Aborted });
      dataAgentPlanServiceSpy.abort.mockReturnValue(of(abortedPlan));

      service.abort('plan-1').subscribe();

      expect(service.isAborting()).toBe(false);
      expect(service.activePlan()).toEqual(abortedPlan);
    });

    it('reloads the plan and rethrows on a 409 conflict', () => {
      const staleConflict = new HttpErrorResponse({ status: 409 });
      const refreshedPlan = makePlan({ status: PlanStatus.Completed });
      dataAgentPlanServiceSpy.abort.mockReturnValue(throwError(() => staleConflict));
      dataAgentPlanServiceSpy.getPlan.mockReturnValue(of(refreshedPlan));

      let caughtError: unknown;
      service.abort('plan-1').subscribe({ error: (err) => (caughtError = err) });

      expect(caughtError).toBe(staleConflict);
      expect(service.activePlan()).toEqual(refreshedPlan);
      expect(service.isAborting()).toBe(false);
    });
  });

  describe('a request the caller abandons', () => {
    it('clears isApproving when the aside closes mid-request', () => {
      dataAgentPlanServiceSpy.approve.mockReturnValue(new Subject<IAgentPlan>());

      const subscription = service.approve('plan-1').subscribe();
      expect(service.isApproving()).toBe(true);

      subscription.unsubscribe();

      expect(service.isApproving()).toBe(false);
    });

    it('clears isAborting when the aside closes mid-request', () => {
      dataAgentPlanServiceSpy.abort.mockReturnValue(new Subject<IAgentPlan>());

      const subscription = service.abort('plan-1').subscribe();
      expect(service.isAborting()).toBe(true);

      subscription.unsubscribe();

      expect(service.isAborting()).toBe(false);
    });
  });

  describe('refreshActivePlan', () => {
    it('picks the first non-terminal plan and sets it active', () => {
      const finishedPlan = makePlan({ id: 'plan-0', status: PlanStatus.Completed });
      const runningPlan = makePlan({ id: 'plan-1', status: PlanStatus.Executing });
      dataAgentPlanServiceSpy.listMyPlans.mockReturnValue(of([finishedPlan, runningPlan]));

      service.refreshActivePlan().subscribe((active) => {
        expect(active).toEqual(runningPlan);
      });

      expect(service.activePlan()).toEqual(runningPlan);
    });

    it('clears the active plan when every plan is terminal', () => {
      const finishedPlan = makePlan({ status: PlanStatus.Completed });
      dataAgentPlanServiceSpy.listMyPlans.mockReturnValue(of([finishedPlan]));

      service.refreshActivePlan().subscribe();

      expect(service.activePlan()).toBeNull();
      expect(service.totalSteps()).toBe(0);
    });
  });

  describe('hasVisiblePlan', () => {
    it('stays true after the active plan turns terminal via a SignalR update', () => {
      const plan = makePlan({ status: PlanStatus.Executing });
      dataAgentPlanServiceSpy.createAndStart.mockReturnValue(of(plan));
      service.createAndStart({ goal: plan.goal }).subscribe();
      expect(service.hasVisiblePlan()).toBe(true);

      planUpdated$.next({
        planId: plan.id,
        status: PlanStatus.Failed,
        currentStepIndex: 0,
        totalSteps: 1,
        lastErrorMessage: 'boom',
        timestamp: new Date().toISOString(),
      });

      expect(service.hasVisiblePlan()).toBe(true);
      expect(service.isFailed()).toBe(true);
    });

    it('is false when there is no active plan', () => {
      expect(service.hasVisiblePlan()).toBe(false);
    });
  });

  describe('SignalR plan updates', () => {
    it('ignores updates for a different plan id', () => {
      const plan = makePlan();
      dataAgentPlanServiceSpy.createAndStart.mockReturnValue(of(plan));
      service.createAndStart({ goal: plan.goal }).subscribe();

      planUpdated$.next({
        planId: 'other-plan',
        status: PlanStatus.Failed,
        currentStepIndex: 3,
        totalSteps: 5,
        timestamp: new Date().toISOString(),
      });

      expect(service.activePlan()?.status).toBe(PlanStatus.Executing);
    });
  });
});
