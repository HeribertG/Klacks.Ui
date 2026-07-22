// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { DataAgentPlanService } from './data-agent-plan.service';
import { IAgentPlan, PlanStatus } from 'src/app/domain/models/assistant/agent-plan.interface';
import { environment } from 'src/environments/environment';

describe('DataAgentPlanService', () => {
  let service: DataAgentPlanService;
  let httpMock: HttpTestingController;
  let apiUrl: string;

  const mockPlan: IAgentPlan = {
    id: 'plan-1',
    agentId: 'agent-1',
    userId: 'user-1',
    goal: 'onboard Max Müller',
    stepsJson: '[]',
    status: PlanStatus.Executing,
    currentStepIndex: 0,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataAgentPlanService],
    });
    service = TestBed.inject(DataAgentPlanService);
    httpMock = TestBed.inject(HttpTestingController);
    apiUrl = `${environment.baseAssistantUrl}plans`;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('createAndStart posts the goal and returns the created plan', () => {
    service.createAndStart({ goal: 'onboard Max Müller' }).subscribe((plan) => {
      expect(plan).toEqual(mockPlan);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ goal: 'onboard Max Müller' });
    req.flush(mockPlan);
  });

  it('approve posts to plans/{id}/approve', () => {
    service.approve('plan-1').subscribe((plan) => {
      expect(plan).toEqual(mockPlan);
    });

    const req = httpMock.expectOne(`${apiUrl}/plan-1/approve`);
    expect(req.request.method).toBe('POST');
    req.flush(mockPlan);
  });

  it('abort posts to plans/{id}/abort', () => {
    const abortedPlan: IAgentPlan = { ...mockPlan, status: PlanStatus.Aborted };

    service.abort('plan-1').subscribe((plan) => {
      expect(plan).toEqual(abortedPlan);
    });

    const req = httpMock.expectOne(`${apiUrl}/plan-1/abort`);
    expect(req.request.method).toBe('POST');
    req.flush(abortedPlan);
  });

  it('listMyPlans fetches all plans for the current user', () => {
    service.listMyPlans().subscribe((plans) => {
      expect(plans).toEqual([mockPlan]);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush([mockPlan]);
  });

  it('getPlan fetches a single plan by id', () => {
    service.getPlan('plan-1').subscribe((plan) => {
      expect(plan).toEqual(mockPlan);
    });

    const req = httpMock.expectOne(`${apiUrl}/plan-1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPlan);
  });
});
