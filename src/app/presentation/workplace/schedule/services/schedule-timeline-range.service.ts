// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service controlling the timeline view time range (full 24h vs. day 06:00–19:00).
 * Persisted in localStorage; triggers a grid refresh on change.
 */
import { Injectable, computed, inject, signal } from '@angular/core';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';

export type TimelineViewRange = 'full' | 'day';

const RANGE_STORAGE_KEY = 'klacks.schedule.timelineViewRange';
const FULL_RANGE: TimelineViewRange = 'full';
const DAY_RANGE: TimelineViewRange = 'day';
const FULL_TOTAL_MINUTES = 1440;
const DAY_FROM_MINUTES = 360;
const DAY_TOTAL_MINUTES = 780;

@Injectable()
export class ScheduleTimelineRangeService {
  private dataManagement = inject(DataManagementScheduleService);
  private localStorageService = inject(LocalStorageService);

  readonly viewRange = signal<TimelineViewRange>(this.loadFromStorage());

  readonly dayStart = computed(() =>
    this.viewRange() === FULL_RANGE
      ? OwnTime.forTime('00', '00')
      : OwnTime.forTime('06', '00'),
  );

  readonly dayEnd = computed(() =>
    this.viewRange() === FULL_RANGE
      ? OwnTime.forDuration('24', '00')
      : OwnTime.forTime('19', '00'),
  );

  readonly displayFromMinutes = computed(() =>
    this.viewRange() === FULL_RANGE ? 0 : DAY_FROM_MINUTES,
  );

  readonly totalMinutes = computed(() =>
    this.viewRange() === FULL_RANGE ? FULL_TOTAL_MINUTES : DAY_TOTAL_MINUTES,
  );

  setViewRange(range: TimelineViewRange): void {
    if (this.viewRange() === range) {
      return;
    }
    this.viewRange.set(range);
    this.localStorageService.set(RANGE_STORAGE_KEY, range);
    this.dataManagement.isRead.update((v) => ({
      count: v.count + 1,
      resetScroll: false,
    }));
  }

  private loadFromStorage(): TimelineViewRange {
    return this.localStorageService.get(RANGE_STORAGE_KEY) === DAY_RANGE
      ? DAY_RANGE
      : FULL_RANGE;
  }
}
