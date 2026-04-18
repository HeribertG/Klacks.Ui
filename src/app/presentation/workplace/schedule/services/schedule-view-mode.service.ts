// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service holding the Schedule view mode (table vs timeline) and the timeline
 * row-height factor as single source of truth. Persists both in sessionStorage
 * so a page reload restores the last choice.
 * @param viewMode - Signal exposing the currently active view mode
 * @param isTimelineMode - Computed signal, true when timeline view is active
 * @param timelineRowHeightFactor - Signal exposing the timeline row-height multiplier (1 = 100%)
 */
import { Injectable, computed, inject, signal } from '@angular/core';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ScheduleDataService } from '../schedule-section/services/schedule-data.service';

export type ScheduleViewMode = 'table' | 'timeline';

const VIEW_MODE_STORAGE_KEY = 'klacks.schedule.viewMode';
const ROW_HEIGHT_FACTOR_STORAGE_KEY = 'klacks.schedule.timelineRowHeightFactor';
const TABLE_MODE: ScheduleViewMode = 'table';
const TIMELINE_MODE: ScheduleViewMode = 'timeline';
const DEFAULT_ROW_HEIGHT_FACTOR = 1;
const MIN_ROW_HEIGHT_FACTOR = 0.5;
const MAX_ROW_HEIGHT_FACTOR = 2;

@Injectable()
export class ScheduleViewModeService {
  private settings = inject(BaseSettingsService);
  private dataService = inject(BaseDataService);
  private dataManagement = inject(DataManagementScheduleService);

  public readonly viewMode = signal<ScheduleViewMode>(this.loadViewModeFromStorage());
  public readonly isTimelineMode = computed(() => this.viewMode() === TIMELINE_MODE);
  public readonly timelineRowHeightFactor = signal<number>(this.loadRowHeightFactorFromStorage());

  constructor() {
    this.settings.setTimelineRowHeightFactor(this.timelineRowHeightFactor());
    this.settings.setTimelineMode(this.viewMode() === TIMELINE_MODE);
  }

  public setViewMode(mode: ScheduleViewMode): void {
    if (this.viewMode() === mode) {
      return;
    }
    this.settings.setTimelineMode(mode === TIMELINE_MODE);
    (this.dataService as ScheduleDataService).setMetrics();
    this.viewMode.set(mode);
    this.persistViewMode(mode);
    this.dataManagement.isRead.update((v) => ({
      count: v.count + 1,
      resetScroll: false,
    }));
  }

  public toggle(): void {
    this.setViewMode(this.isTimelineMode() ? TABLE_MODE : TIMELINE_MODE);
  }

  public setTimelineRowHeightFactor(factor: number): void {
    const clamped = this.clampRowHeightFactor(factor);
    if (this.timelineRowHeightFactor() === clamped) {
      return;
    }
    this.timelineRowHeightFactor.set(clamped);
    this.settings.setTimelineRowHeightFactor(clamped);
    this.persistRowHeightFactor(clamped);
  }

  private loadViewModeFromStorage(): ScheduleViewMode {
    try {
      return sessionStorage.getItem(VIEW_MODE_STORAGE_KEY) === TIMELINE_MODE
        ? TIMELINE_MODE
        : TABLE_MODE;
    } catch {
      return TABLE_MODE;
    }
  }

  private persistViewMode(mode: ScheduleViewMode): void {
    try {
      sessionStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      /* ignore quota/security errors */
    }
  }

  private loadRowHeightFactorFromStorage(): number {
    try {
      const raw = sessionStorage.getItem(ROW_HEIGHT_FACTOR_STORAGE_KEY);
      if (raw === null) {
        return DEFAULT_ROW_HEIGHT_FACTOR;
      }
      const parsed = Number(raw);
      return Number.isFinite(parsed)
        ? this.clampRowHeightFactor(parsed)
        : DEFAULT_ROW_HEIGHT_FACTOR;
    } catch {
      return DEFAULT_ROW_HEIGHT_FACTOR;
    }
  }

  private persistRowHeightFactor(factor: number): void {
    try {
      sessionStorage.setItem(ROW_HEIGHT_FACTOR_STORAGE_KEY, factor.toString());
    } catch {
      /* ignore quota/security errors */
    }
  }

  private clampRowHeightFactor(factor: number): number {
    if (factor < MIN_ROW_HEIGHT_FACTOR) return MIN_ROW_HEIGHT_FACTOR;
    if (factor > MAX_ROW_HEIGHT_FACTOR) return MAX_ROW_HEIGHT_FACTOR;
    return factor;
  }
}
