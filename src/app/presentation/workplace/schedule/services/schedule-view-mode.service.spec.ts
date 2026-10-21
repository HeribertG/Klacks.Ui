// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ScheduleViewModeService } from './schedule-view-mode.service';
import { ScheduleTimelineRangeService } from './schedule-timeline-range.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';

const VIEW_MODE_KEY = 'klacks.schedule.viewMode';
const RANGE_KEY = 'klacks.schedule.timelineViewRange';
const ROW_HEIGHT_KEY = 'klacks.schedule.timelineRowHeightFactor';

describe('schedule view services', () => {
  let stored: Map<string, string>;
  let settings: { setTimelineMode: ReturnType<typeof vi.fn>; setTimelineRowHeightFactor: ReturnType<typeof vi.fn> };
  let setMetrics: ReturnType<typeof vi.fn>;
  let isRead: WritableSignal<{ count: number; resetScroll: boolean }>;

  function configure(): void {
    TestBed.configureTestingModule({
      providers: [
        ScheduleViewModeService,
        ScheduleTimelineRangeService,
        { provide: BaseSettingsService, useValue: settings },
        { provide: BaseDataService, useValue: { setMetrics } },
        { provide: DataManagementScheduleService, useValue: { isRead } },
        {
          provide: LocalStorageService,
          useValue: {
            get: (key: string) => stored.get(key) ?? null,
            set: (key: string, value: string) => stored.set(key, value),
          },
        },
      ],
    });
  }

  beforeEach(() => {
    stored = new Map();
    sessionStorage.clear();
    settings = { setTimelineMode: vi.fn(), setTimelineRowHeightFactor: vi.fn() };
    setMetrics = vi.fn();
    isRead = signal({ count: 0, resetScroll: true });
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('ScheduleViewModeService', () => {
    it('starts from the stored view mode and tab factor and hands both to the grid settings', () => {
      stored.set(VIEW_MODE_KEY, 'timeline');
      sessionStorage.setItem(ROW_HEIGHT_KEY, '1.5');
      configure();

      const service = TestBed.inject(ScheduleViewModeService);

      expect(service.viewMode()).toBe('timeline');
      expect(service.timelineRowHeightFactor()).toBe(1.5);
      expect(settings.setTimelineRowHeightFactor).toHaveBeenCalledWith(1.5);
      expect(settings.setTimelineMode).toHaveBeenCalledWith(true);
    });

    it('switches the view, persists it and triggers one grid re-read', () => {
      configure();
      const service = TestBed.inject(ScheduleViewModeService);

      service.toggle();

      expect(service.viewMode()).toBe('timeline');
      expect(stored.get(VIEW_MODE_KEY)).toBe('timeline');
      expect(setMetrics).toHaveBeenCalledTimes(1);
      expect(isRead()).toEqual({ count: 1, resetScroll: false });

      service.setViewMode('timeline');
      expect(isRead().count).toBe(1);
    });

    it('clamps, applies and persists a new row-height factor only when it changes', () => {
      configure();
      const service = TestBed.inject(ScheduleViewModeService);
      settings.setTimelineRowHeightFactor.mockClear();

      service.setTimelineRowHeightFactor(5);
      service.setTimelineRowHeightFactor(2);

      expect(service.timelineRowHeightFactor()).toBe(2);
      expect(settings.setTimelineRowHeightFactor).toHaveBeenCalledTimes(1);
      expect(sessionStorage.getItem(ROW_HEIGHT_KEY)).toBe('2');
    });
  });

  describe('ScheduleTimelineRangeService', () => {
    it('starts from the stored day range', () => {
      stored.set(RANGE_KEY, 'day');
      configure();

      const service = TestBed.inject(ScheduleTimelineRangeService);

      expect(service.viewRange()).toBe('day');
      expect(service.displayFromMinutes()).toBe(360);
      expect(service.totalMinutes()).toBe(780);
    });

    it('persists a new range and triggers one grid re-read, ignoring the current range', () => {
      configure();
      const service = TestBed.inject(ScheduleTimelineRangeService);

      service.setViewRange('full');
      expect(isRead().count).toBe(0);

      service.setViewRange('day');

      expect(stored.get(RANGE_KEY)).toBe('day');
      expect(isRead()).toEqual({ count: 1, resetScroll: false });
    });
  });
});
