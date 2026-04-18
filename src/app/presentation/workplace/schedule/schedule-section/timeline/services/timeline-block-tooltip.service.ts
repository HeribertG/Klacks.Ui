// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Builds the tooltip text shown when the user hovers a Work / WorkChange / Break
 * block in the timeline view. Delegates the abbreviation to the per-entry
 * block renderer so the tooltip label matches the text drawn on the block.
 * @param workRenderer - Supplies the Work-entry abbreviation
 * @param workChangeRenderer - Supplies the WorkChange-entry abbreviation
 * @param breakRenderer - Supplies the Break/absence abbreviation
 */
import { Injectable, inject } from '@angular/core';
import {
  IScheduleCell,
  WorkScheduleEntryType,
} from 'src/app/domain/models/schedule/work-schedule-class';
import { formatTime, timeToMinutes } from 'src/app/shared/helpers/time-format.helper';
import { ITimelineBlockRenderer } from '../renderers/timeline-block-renderer.interface';
import { WorkBlockRendererService } from '../renderers/work-block-renderer.service';
import { WorkChangeBlockRendererService } from '../renderers/work-change-block-renderer.service';
import { BreakBlockRendererService } from '../renderers/break-block-renderer.service';

const DAY_TOTAL_MINUTES = 24 * 60;
const MINUTES_PER_HOUR = 60;

@Injectable()
export class TimelineBlockTooltipService {
  private workRenderer = inject(WorkBlockRendererService);
  private workChangeRenderer = inject(WorkChangeBlockRendererService);
  private breakRenderer = inject(BreakBlockRendererService);

  public buildBlockTooltip(entry: IScheduleCell): string | undefined {
    if (!entry.startTime || !entry.endTime) {
      return undefined;
    }
    const renderer = this.resolveRenderer(entry);
    const label = renderer?.getLabel(entry)?.trim() ?? '';
    const timeLine = `${formatTime(entry.startTime)} - ${formatTime(entry.endTime)}`;
    const duration = this.formatDuration(entry.startTime, entry.endTime);
    const lines = [label, timeLine, duration].filter((l) => l.length > 0);
    return lines.join('\n');
  }

  private resolveRenderer(entry: IScheduleCell): ITimelineBlockRenderer | undefined {
    switch (entry.entryType) {
      case WorkScheduleEntryType.Work:
        return this.workRenderer;
      case WorkScheduleEntryType.WorkChange:
        return this.workChangeRenderer;
      case WorkScheduleEntryType.Break:
        return this.breakRenderer;
      default:
        return undefined;
    }
  }

  private formatDuration(startTime: string, endTime: string): string {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    let minutes = end - start;
    if (minutes <= 0) {
      minutes += DAY_TOTAL_MINUTES;
    }
    const hours = Math.floor(minutes / MINUTES_PER_HOUR);
    const remainder = minutes % MINUTES_PER_HOUR;
    const hh = hours.toString().padStart(2, '0');
    const mm = remainder.toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }
}
