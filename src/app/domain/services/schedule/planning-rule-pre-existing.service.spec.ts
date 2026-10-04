// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal } from '@angular/core';
import { PlanningRulePreExistingService } from './planning-rule-pre-existing.service';
import { SCHEDULE_VALIDATION_KEY_PLANNING_RULE } from 'src/app/domain/constants/schedule-validation-keys.constants';
import { ScheduleErrorEntry } from 'src/app/domain/interfaces/schedule-error-entry.interface';

function finding(clientId: string, ruleId = 'r1'): ScheduleErrorEntry {
  return {
    type: 'error',
    date: '2026-10-05',
    clientId,
    clientName: clientId,
    comment: SCHEDULE_VALIDATION_KEY_PLANNING_RULE,
    commentParams: { ruleId },
  };
}

describe('PlanningRulePreExistingService', () => {
  let service: PlanningRulePreExistingService;

  beforeEach(() => {
    service = new PlanningRulePreExistingService();
  });

  it('marks nothing before any run', () => {
    expect(service.isPreExisting(finding('c1'))).toBe(false);
  });

  it('marks nothing while the run has no result', () => {
    const result = signal<object | null>(null);
    service.captureBeforeRun([finding('c1')], result);
    expect(service.isPreExisting(finding('c1'))).toBe(false);
  });

  it('marks only the findings that existed when the run started, once it has a result', () => {
    const result = signal<object | null>(null);
    service.captureBeforeRun([finding('c1')], result);
    result.set({});
    expect(service.isPreExisting(finding('c1'))).toBe(true);
    expect(service.isPreExisting(finding('c2'))).toBe(false);
    expect(service.isPreExisting(finding('c1', 'r2'))).toBe(false);
  });

  it('marks nothing while the signal still holds the result of an earlier run (refused or failed start)', () => {
    const result = signal<object | null>({});
    service.captureBeforeRun([finding('c1')], result);
    expect(service.isPreExisting(finding('c1'))).toBe(false);
  });

  it('marks the snapshot once the signal holds a result other than the earlier one', () => {
    const result = signal<object | null>({});
    service.captureBeforeRun([finding('c1')], result);
    result.set({});
    expect(service.isPreExisting(finding('c1'))).toBe(true);
  });

  it('never marks soft findings', () => {
    const result = signal<object | null>(null);
    const soft: ScheduleErrorEntry = { ...finding('c1'), type: 'warning' };
    service.captureBeforeRun([soft, finding('c2')], result);
    result.set({});
    expect(service.isPreExisting(soft)).toBe(false);
    expect(service.isPreExisting(finding('c2'))).toBe(true);
  });

  it('replaces the previous snapshot when a new run starts', () => {
    const first = signal<object | null>(null);
    service.captureBeforeRun([finding('c1')], first);
    first.set({});
    expect(service.isPreExisting(finding('c1'))).toBe(true);
    const second = signal<object | null>(null);
    service.captureBeforeRun([finding('c2')], second);
    expect(service.isPreExisting(finding('c1'))).toBe(false);
    second.set({});
    expect(service.isPreExisting(finding('c2'))).toBe(true);
    expect(service.isPreExisting(finding('c1'))).toBe(false);
  });
});
