// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Values of the schedule view preferences: table or timeline view, the timeline time range (full day or the
 * 06:00-19:00 day range) and the bounds of the timeline row-height factor.
 */
import { ScheduleViewMode } from 'src/app/domain/models/schedule/schedule-view-mode.type';
import { TimelineViewRange } from 'src/app/domain/models/schedule/timeline-view-range.type';

export const SCHEDULE_TABLE_MODE: ScheduleViewMode = 'table';
export const SCHEDULE_TIMELINE_MODE: ScheduleViewMode = 'timeline';

export const TIMELINE_FULL_RANGE: TimelineViewRange = 'full';
export const TIMELINE_DAY_RANGE: TimelineViewRange = 'day';

export const DEFAULT_TIMELINE_ROW_HEIGHT_FACTOR = 1;
export const MIN_TIMELINE_ROW_HEIGHT_FACTOR = 0.5;
export const MAX_TIMELINE_ROW_HEIGHT_FACTOR = 2;
