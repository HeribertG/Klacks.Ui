// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Service controlling the timeline view time range (full 24h vs. day 06:00–19:00).
 * Persisted through ScheduleViewPreferenceService; triggers a grid refresh on change.
 */
import { Injectable, computed, inject, signal } from '@angular/core';
import { OwnTime } from 'src/app/domain/models/schedule/own-time-class';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { TimelineViewRange } from 'src/app/domain/models/schedule/timeline-view-range.type';
import { ScheduleViewPreferenceService } from 'src/app/domain/services/schedule/schedule-view-preference.service';
import { TIMELINE_FULL_RANGE } from 'src/app/domain/constants/schedule-view.constants';

const FULL_TOTAL_MINUTES = 1440;
const DAY_FROM_MINUTES = 360;
const DAY_TOTAL_MINUTES = 780;

@Injectable()
export class ScheduleTimelineRangeService {
  private dataManagement = inject(DataManagementScheduleService);
  private viewPreference = inject(ScheduleViewPreferenceService);

  readonly viewRange = signal<TimelineViewRange>(this.viewPreference.loadTimelineViewRange());

  readonly dayStart = computed(() =>
    this.viewRange() === TIMELINE_FULL_RANGE
      ? OwnTime.forTime('00', '00')
      : OwnTime.forTime('06', '00'),
  );

  readonly dayEnd = computed(() =>
    this.viewRange() === TIMELINE_FULL_RANGE
      ? OwnTime.forDuration('24', '00')
      : OwnTime.forTime('19', '00'),
  );

  readonly displayFromMinutes = computed(() =>
    this.viewRange() === TIMELINE_FULL_RANGE ? 0 : DAY_FROM_MINUTES,
  );

  readonly totalMinutes = computed(() =>
    this.viewRange() === TIMELINE_FULL_RANGE ? FULL_TOTAL_MINUTES : DAY_TOTAL_MINUTES,
  );

  setViewRange(range: TimelineViewRange): void {
    if (this.viewRange() === range) {
      return;
    }
    this.viewRange.set(range);
    this.viewPreference.saveTimelineViewRange(range);
    this.dataManagement.isRead.update((v) => ({
      count: v.count + 1,
      resetScroll: false,
    }));
  }
}
