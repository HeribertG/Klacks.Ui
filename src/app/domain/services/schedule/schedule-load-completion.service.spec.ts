// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { ScheduleLoadCompletionService } from './schedule-load-completion.service';
import { DataManagementScheduleService } from './data-management-schedule.service';
import {
  SCHEDULE_LOAD_OUTCOME,
  SCHEDULE_LOAD_POLL_INTERVAL_MS,
  SCHEDULE_LOAD_TIMEOUT_MS,
} from 'src/app/domain/constants/schedule-load-completion.constants';

describe('ScheduleLoadCompletionService', () => {
  let schedule: { isScheduleFullyLoaded: boolean; isScheduleLoadStalled: boolean };
  let service: ScheduleLoadCompletionService;

  beforeEach(() => {
    vi.useFakeTimers();
    schedule = { isScheduleFullyLoaded: false, isScheduleLoadStalled: false };
    TestBed.configureTestingModule({
      providers: [{ provide: DataManagementScheduleService, useValue: schedule }],
    });
    service = TestBed.inject(ScheduleLoadCompletionService);
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('resolves complete at once when everything is loaded', async () => {
    // Arrange
    schedule.isScheduleFullyLoaded = true;

    // Act
    const outcome = await service.awaitFullyLoaded();

    // Assert
    expect(outcome).toBe(SCHEDULE_LOAD_OUTCOME.Complete);
  });

  it('waits until the last chunk has arrived', async () => {
    // Arrange
    const pending = service.awaitFullyLoaded();

    // Act
    await vi.advanceTimersByTimeAsync(SCHEDULE_LOAD_POLL_INTERVAL_MS * 3);
    schedule.isScheduleFullyLoaded = true;
    await vi.advanceTimersByTimeAsync(SCHEDULE_LOAD_POLL_INTERVAL_MS);

    // Assert
    await expect(pending).resolves.toBe(SCHEDULE_LOAD_OUTCOME.Complete);
  });

  it('reports a stalled load instead of waiting forever', async () => {
    // Arrange
    schedule.isScheduleLoadStalled = true;

    // Act
    const outcome = await service.awaitFullyLoaded();

    // Assert
    expect(outcome).toBe(SCHEDULE_LOAD_OUTCOME.Stalled);
  });

  it('gives up after the timeout', async () => {
    // Arrange
    const pending = service.awaitFullyLoaded();

    // Act
    await vi.advanceTimersByTimeAsync(SCHEDULE_LOAD_TIMEOUT_MS + SCHEDULE_LOAD_POLL_INTERVAL_MS);

    // Assert
    await expect(pending).resolves.toBe(SCHEDULE_LOAD_OUTCOME.Timeout);
  });
});
