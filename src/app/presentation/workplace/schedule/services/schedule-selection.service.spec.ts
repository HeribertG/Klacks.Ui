// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { ScheduleSelectionService } from './schedule-selection.service';

describe('ScheduleSelectionService', () => {
  let service: ScheduleSelectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScheduleSelectionService);
  });

  it('starts without a selected work', () => {
    expect(service.selectedWork()).toBeNull();
  });

  it('publishes the selected work and clears it again', () => {
    const date = new Date(2026, 9, 6);

    service.select({ clientId: 'client-1', date });
    expect(service.selectedWork()).toEqual({ clientId: 'client-1', date });

    service.clear();
    expect(service.selectedWork()).toBeNull();
  });

  it('keeps the same signal value when the same cell is selected again', () => {
    service.select({ clientId: 'client-1', date: new Date(2026, 9, 6) });
    const first = service.selectedWork();

    service.select({ clientId: 'client-1', date: new Date(2026, 9, 6) });

    expect(service.selectedWork()).toBe(first);
  });

  it('switches to another employee or day', () => {
    service.select({ clientId: 'client-1', date: new Date(2026, 9, 6) });

    service.select({ clientId: 'client-1', date: new Date(2026, 9, 7) });
    expect(service.selectedWork()?.date).toEqual(new Date(2026, 9, 7));

    service.select({ clientId: 'client-2', date: new Date(2026, 9, 7) });
    expect(service.selectedWork()?.clientId).toBe('client-2');
  });
});
