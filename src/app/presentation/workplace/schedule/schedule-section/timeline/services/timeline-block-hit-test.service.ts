// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Hit-test helper for the timeline view. Translates a mouse Y-offset within a
 * cell into the matching schedule entry (Work / WorkChange / Break), honouring
 * midnight-split blocks that carry over into the next column.
 * @param scheduleData - Provides the entries per (row, col)
 * @param settings - Grid settings (cell height for pixels-per-minute math)
 */
import { Injectable, inject } from '@angular/core';
import {
  IScheduleCell,
  WorkScheduleEntryType,
} from 'src/app/domain/models/schedule/work-schedule-class';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { timeToMinutes } from 'src/app/shared/helpers/time-format.helper';
import { ScheduleDataService } from '../../services/schedule-data.service';

const DAY_TOTAL_MINUTES = 24 * 60;
const HIT_TEST_EPSILON = 0.5;

export interface TimelineHitResult {
  entry: IScheduleCell;
  mainCol: number;
}

interface EntryRect {
  entry: IScheduleCell;
  mainCol: number;
  yStart: number;
  yEnd: number;
}

@Injectable()
export class TimelineBlockHitTestService {
  private scheduleData = inject(ScheduleDataService);
  private settings = inject(BaseSettingsService);

  public hitTest(
    row: number,
    col: number,
    relativeY: number,
  ): TimelineHitResult | null {
    if (relativeY < 0 || relativeY > this.settings.cellHeight) {
      return null;
    }

    const rects = this.collectRects(row, col);
    for (let i = rects.length - 1; i >= 0; i--) {
      const rect = rects[i];
      if (
        relativeY >= rect.yStart - HIT_TEST_EPSILON &&
        relativeY <= rect.yEnd + HIT_TEST_EPSILON
      ) {
        return { entry: rect.entry, mainCol: rect.mainCol };
      }
    }
    return null;
  }

  public computeBlockRange(
    entry: IScheduleCell,
    isOverflowPart: boolean,
  ): { yStart: number; yEnd: number } | null {
    const minutes = this.toMinutesRange(entry);
    if (!minutes) {
      return null;
    }

    const pixelsPerMinute = this.settings.cellHeight / DAY_TOTAL_MINUTES;
    if (isOverflowPart) {
      const overflowEnd = minutes.end - DAY_TOTAL_MINUTES;
      if (overflowEnd <= 0) {
        return null;
      }
      return { yStart: 0, yEnd: overflowEnd * pixelsPerMinute };
    }

    const endToday = Math.min(minutes.end, DAY_TOTAL_MINUTES);
    if (endToday <= minutes.start) {
      return null;
    }
    return {
      yStart: minutes.start * pixelsPerMinute,
      yEnd: endToday * pixelsPerMinute,
    };
  }

  public spansMidnight(entry: IScheduleCell): boolean {
    const minutes = this.toMinutesRange(entry);
    return !!minutes && minutes.end > DAY_TOTAL_MINUTES;
  }

  private collectRects(row: number, col: number): EntryRect[] {
    const rects: EntryRect[] = [];

    const todayEntries = this.scheduleData
      .getWorkScheduleForCell(row, col)
      .filter((e) => this.isTimelineEntry(e));
    for (const entry of todayEntries) {
      const range = this.computeBlockRange(entry, false);
      if (range) {
        rects.push({ entry, mainCol: col, ...range });
      }
    }

    if (col > 0) {
      const overflowEntries = this.scheduleData
        .getWorkScheduleForCell(row, col - 1)
        .filter((e) => this.isTimelineEntry(e) && this.spansMidnight(e));
      for (const entry of overflowEntries) {
        const range = this.computeBlockRange(entry, true);
        if (range) {
          rects.push({ entry, mainCol: col - 1, ...range });
        }
      }
    }

    return rects;
  }

  private isTimelineEntry(entry: IScheduleCell): boolean {
    return (
      entry.entryType === WorkScheduleEntryType.Work ||
      entry.entryType === WorkScheduleEntryType.WorkChange ||
      entry.entryType === WorkScheduleEntryType.Break
    );
  }

  private toMinutesRange(
    entry: IScheduleCell,
  ): { start: number; end: number } | undefined {
    if (!entry.startTime || !entry.endTime) {
      return undefined;
    }
    const start = timeToMinutes(entry.startTime);
    const end = timeToMinutes(entry.endTime);
    if (!start && !entry.startTime.startsWith('00')) {
      return undefined;
    }
    return {
      start,
      end: end <= start ? end + DAY_TOTAL_MINUTES : end,
    };
  }
}
