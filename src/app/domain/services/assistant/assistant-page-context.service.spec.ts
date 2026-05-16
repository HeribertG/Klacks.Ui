// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AssistantPageContextService } from './assistant-page-context.service';

describe('AssistantPageContextService', () => {
  let service: AssistantPageContextService;
  let routerMock: { url: string };

  beforeEach(() => {
    routerMock = { url: '/schedule' };

    TestBed.configureTestingModule({
      providers: [
        AssistantPageContextService,
        { provide: Router, useValue: routerMock },
      ],
    });

    service = TestBed.inject(AssistantPageContextService);
  });

  it('returns currentRoute from Router', () => {
    const ctx = service.getPageContext();
    expect(ctx.currentRoute).toBe('/schedule');
  });

  it('omits currentRoute when route is "/"', () => {
    routerMock.url = '/';
    const ctx = service.getPageContext();
    expect(ctx.currentRoute).toBeUndefined();
  });

  it('returns selectedGroupId after setter call', () => {
    service.setSelectedGroupId('group-1');
    const ctx = service.getPageContext();
    expect(ctx.selectedGroupId).toBe('group-1');
  });

  it('returns selectedPeriod after setter call', () => {
    service.setSelectedPeriod('2026-06-01', '2026-06-30');
    const ctx = service.getPageContext();
    expect(ctx.selectedPeriodFrom).toBe('2026-06-01');
    expect(ctx.selectedPeriodUntil).toBe('2026-06-30');
  });

  it('returns selectedClientId after setter call', () => {
    service.setSelectedClientId('client-1');
    const ctx = service.getPageContext();
    expect(ctx.selectedClientId).toBe('client-1');
  });

  it('reset clears all selections but keeps currentRoute', () => {
    service.setSelectedGroupId('g1');
    service.setSelectedClientId('c1');
    service.setSelectedPeriod('2026-06-01', '2026-06-30');

    service.reset();

    const ctx = service.getPageContext();
    expect(ctx.selectedGroupId).toBeUndefined();
    expect(ctx.selectedClientId).toBeUndefined();
    expect(ctx.selectedPeriodFrom).toBeUndefined();
    expect(ctx.selectedPeriodUntil).toBeUndefined();
    expect(ctx.currentRoute).toBe('/schedule');
  });
});
