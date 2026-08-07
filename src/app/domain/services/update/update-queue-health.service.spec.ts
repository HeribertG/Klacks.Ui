// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';

import { UpdateQueueHealthService } from './update-queue-health.service';

const MINUTE_MS = 60000;

const minutesAgo = (minutes: number): string => new Date(Date.now() - minutes * MINUTE_MS).toISOString();

describe('UpdateQueueHealthService', () => {
  let service: UpdateQueueHealthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UpdateQueueHealthService);
  });

  it('flags a pending operation that stayed unclaimed past the grace period', () => {
    expect(
      service.isAwaitingUpdater({ status: 'Pending', requestedAt: minutesAgo(10), startedAt: null }),
    ).toBe(true);
  });

  it('gives a freshly queued operation time to be claimed', () => {
    expect(
      service.isAwaitingUpdater({ status: 'Pending', requestedAt: minutesAgo(1), startedAt: null }),
    ).toBe(false);
  });

  it('never flags an operation an updater already claimed', () => {
    expect(
      service.isAwaitingUpdater({
        status: 'Pending',
        requestedAt: minutesAgo(60),
        startedAt: minutesAgo(59),
      }),
    ).toBe(false);
  });

  it('never flags a non-pending operation', () => {
    expect(
      service.isAwaitingUpdater({ status: 'Running', requestedAt: minutesAgo(60), startedAt: null }),
    ).toBe(false);
    expect(
      service.isAwaitingUpdater({ status: 'Failed', requestedAt: minutesAgo(60), startedAt: null }),
    ).toBe(false);
  });

  it('handles a missing operation', () => {
    expect(service.isAwaitingUpdater(null)).toBe(false);
    expect(service.isAwaitingUpdater(undefined)).toBe(false);
    expect(service.waitingMinutes(null)).toBe(0);
  });

  it('reports the whole minutes an operation has been waiting', () => {
    expect(
      service.waitingMinutes({ status: 'Pending', requestedAt: minutesAgo(17), startedAt: null }),
    ).toBe(17);
  });

  it('falls back to zero on an unparsable timestamp', () => {
    const operation = { status: 'Pending', requestedAt: 'not-a-date', startedAt: null };
    expect(service.waitingMinutes(operation)).toBe(0);
    expect(service.isAwaitingUpdater(operation)).toBe(false);
  });
});
