// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Persists the schedule view preferences of this browser: the view mode (table or timeline) and the timeline time
 * range in localStorage (they survive a browser restart), the timeline row-height factor in sessionStorage (per tab,
 * clamped to its bounds). Unknown stored values fall back to the table view, the full range and the default factor.
 */
import { inject, Injectable } from '@angular/core';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { ScheduleViewMode } from 'src/app/domain/models/schedule/schedule-view-mode.type';
import { TimelineViewRange } from 'src/app/domain/models/schedule/timeline-view-range.type';
import {
  DEFAULT_TIMELINE_ROW_HEIGHT_FACTOR,
  MAX_TIMELINE_ROW_HEIGHT_FACTOR,
  MIN_TIMELINE_ROW_HEIGHT_FACTOR,
  SCHEDULE_TABLE_MODE,
  SCHEDULE_TIMELINE_MODE,
  TIMELINE_DAY_RANGE,
  TIMELINE_FULL_RANGE,
} from 'src/app/domain/constants/schedule-view.constants';

const VIEW_MODE_STORAGE_KEY = 'klacks.schedule.viewMode';
const ROW_HEIGHT_FACTOR_STORAGE_KEY = 'klacks.schedule.timelineRowHeightFactor';
const TIMELINE_RANGE_STORAGE_KEY = 'klacks.schedule.timelineViewRange';

@Injectable({
  providedIn: 'root',
})
export class ScheduleViewPreferenceService {
  private localStorageService = inject(LocalStorageService);

  loadViewMode(): ScheduleViewMode {
    return this.localStorageService.get(VIEW_MODE_STORAGE_KEY) === SCHEDULE_TIMELINE_MODE
      ? SCHEDULE_TIMELINE_MODE
      : SCHEDULE_TABLE_MODE;
  }

  saveViewMode(mode: ScheduleViewMode): void {
    this.localStorageService.set(VIEW_MODE_STORAGE_KEY, mode);
  }

  loadTimelineViewRange(): TimelineViewRange {
    return this.localStorageService.get(TIMELINE_RANGE_STORAGE_KEY) === TIMELINE_DAY_RANGE
      ? TIMELINE_DAY_RANGE
      : TIMELINE_FULL_RANGE;
  }

  saveTimelineViewRange(range: TimelineViewRange): void {
    this.localStorageService.set(TIMELINE_RANGE_STORAGE_KEY, range);
  }

  loadTimelineRowHeightFactor(): number {
    try {
      const raw = sessionStorage.getItem(ROW_HEIGHT_FACTOR_STORAGE_KEY);
      if (raw === null) {
        return DEFAULT_TIMELINE_ROW_HEIGHT_FACTOR;
      }
      const parsed = Number(raw);
      return Number.isFinite(parsed)
        ? this.clampTimelineRowHeightFactor(parsed)
        : DEFAULT_TIMELINE_ROW_HEIGHT_FACTOR;
    } catch {
      return DEFAULT_TIMELINE_ROW_HEIGHT_FACTOR;
    }
  }

  saveTimelineRowHeightFactor(factor: number): void {
    try {
      sessionStorage.setItem(ROW_HEIGHT_FACTOR_STORAGE_KEY, factor.toString());
    } catch {
      return;
    }
  }

  clampTimelineRowHeightFactor(factor: number): number {
    if (factor < MIN_TIMELINE_ROW_HEIGHT_FACTOR) return MIN_TIMELINE_ROW_HEIGHT_FACTOR;
    if (factor > MAX_TIMELINE_ROW_HEIGHT_FACTOR) return MAX_TIMELINE_ROW_HEIGHT_FACTOR;
    return factor;
  }
}
