// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Service holding the Schedule view mode (table vs timeline) and the timeline
 * row-height factor as single source of truth. Both are persisted through
 * ScheduleViewPreferenceService (view mode per browser, row-height factor per tab).
 * @param viewMode - Signal exposing the currently active view mode
 * @param isTimelineMode - Computed signal, true when timeline view is active
 * @param timelineRowHeightFactor - Signal exposing the timeline row-height multiplier (1 = 100%)
 */
import { Injectable, computed, inject, signal } from '@angular/core';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ScheduleViewPreferenceService } from 'src/app/domain/services/schedule/schedule-view-preference.service';
import { ScheduleViewMode } from 'src/app/domain/models/schedule/schedule-view-mode.type';
import {
  SCHEDULE_TABLE_MODE,
  SCHEDULE_TIMELINE_MODE,
} from 'src/app/domain/constants/schedule-view.constants';
import { ScheduleDataService } from '../schedule-section/services/schedule-data.service';

@Injectable()
export class ScheduleViewModeService {
  private settings = inject(BaseSettingsService);
  private dataService = inject(BaseDataService);
  private dataManagement = inject(DataManagementScheduleService);
  private viewPreference = inject(ScheduleViewPreferenceService);

  public readonly viewMode = signal<ScheduleViewMode>(this.viewPreference.loadViewMode());
  public readonly isTimelineMode = computed(() => this.viewMode() === SCHEDULE_TIMELINE_MODE);
  public readonly timelineRowHeightFactor = signal<number>(this.viewPreference.loadTimelineRowHeightFactor());

  constructor() {
    this.settings.setTimelineRowHeightFactor(this.timelineRowHeightFactor());
    this.settings.setTimelineMode(this.viewMode() === SCHEDULE_TIMELINE_MODE);
  }

  public setViewMode(mode: ScheduleViewMode): void {
    if (this.viewMode() === mode) {
      return;
    }
    this.settings.setTimelineMode(mode === SCHEDULE_TIMELINE_MODE);
    (this.dataService as ScheduleDataService).setMetrics();
    this.viewMode.set(mode);
    this.viewPreference.saveViewMode(mode);
    this.dataManagement.isRead.update((v) => ({
      count: v.count + 1,
      resetScroll: false,
    }));
  }

  public toggle(): void {
    this.setViewMode(this.isTimelineMode() ? SCHEDULE_TABLE_MODE : SCHEDULE_TIMELINE_MODE);
  }

  public setTimelineRowHeightFactor(factor: number): void {
    const clamped = this.viewPreference.clampTimelineRowHeightFactor(factor);
    if (this.timelineRowHeightFactor() === clamped) {
      return;
    }
    this.timelineRowHeightFactor.set(clamped);
    this.settings.setTimelineRowHeightFactor(clamped);
    this.viewPreference.saveTimelineRowHeightFactor(clamped);
  }
}
