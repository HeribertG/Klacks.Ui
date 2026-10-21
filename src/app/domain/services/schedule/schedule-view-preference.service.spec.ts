// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ScheduleViewPreferenceService } from './schedule-view-preference.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';

const VIEW_MODE_KEY = 'klacks.schedule.viewMode';
const RANGE_KEY = 'klacks.schedule.timelineViewRange';
const ROW_HEIGHT_KEY = 'klacks.schedule.timelineRowHeightFactor';

describe('ScheduleViewPreferenceService', () => {
  let service: ScheduleViewPreferenceService;
  let stored: Map<string, string>;

  beforeEach(() => {
    stored = new Map();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: LocalStorageService,
          useValue: {
            get: (key: string) => stored.get(key) ?? null,
            set: (key: string, value: string) => stored.set(key, value),
          },
        },
      ],
    });
    service = TestBed.inject(ScheduleViewPreferenceService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  describe('view mode', () => {
    it('reads the timeline view only when it was stored, anything else is the table view', () => {
      expect(service.loadViewMode()).toBe('table');
      stored.set(VIEW_MODE_KEY, 'timeline');
      expect(service.loadViewMode()).toBe('timeline');
      stored.set(VIEW_MODE_KEY, 'something-else');
      expect(service.loadViewMode()).toBe('table');
    });

    it('stores the chosen view mode under its key', () => {
      service.saveViewMode('timeline');

      expect(stored.get(VIEW_MODE_KEY)).toBe('timeline');
    });
  });

  describe('timeline range', () => {
    it('reads the day range only when it was stored, anything else is the full range', () => {
      expect(service.loadTimelineViewRange()).toBe('full');
      stored.set(RANGE_KEY, 'day');
      expect(service.loadTimelineViewRange()).toBe('day');
      stored.set(RANGE_KEY, 'week');
      expect(service.loadTimelineViewRange()).toBe('full');
    });

    it('stores the chosen range under its key', () => {
      service.saveTimelineViewRange('day');

      expect(stored.get(RANGE_KEY)).toBe('day');
    });
  });

  describe('timeline row-height factor', () => {
    it('defaults to 1 when nothing or garbage is stored in the tab', () => {
      expect(service.loadTimelineRowHeightFactor()).toBe(1);
      sessionStorage.setItem(ROW_HEIGHT_KEY, 'abc');
      expect(service.loadTimelineRowHeightFactor()).toBe(1);
    });

    it('reads the stored factor clamped to 0.5 .. 2', () => {
      sessionStorage.setItem(ROW_HEIGHT_KEY, '1.5');
      expect(service.loadTimelineRowHeightFactor()).toBe(1.5);
      sessionStorage.setItem(ROW_HEIGHT_KEY, '0.1');
      expect(service.loadTimelineRowHeightFactor()).toBe(0.5);
      sessionStorage.setItem(ROW_HEIGHT_KEY, '7');
      expect(service.loadTimelineRowHeightFactor()).toBe(2);
    });

    it('stores the factor in the tab and swallows storage errors on read and write', () => {
      service.saveTimelineRowHeightFactor(1.25);
      expect(sessionStorage.getItem(ROW_HEIGHT_KEY)).toBe('1.25');

      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota');
      });

      expect(service.loadTimelineRowHeightFactor()).toBe(1);
      expect(() => service.saveTimelineRowHeightFactor(1.5)).not.toThrow();
    });

    it('clamps a requested factor to its bounds', () => {
      expect(service.clampTimelineRowHeightFactor(0.2)).toBe(0.5);
      expect(service.clampTimelineRowHeightFactor(1.75)).toBe(1.75);
      expect(service.clampTimelineRowHeightFactor(3)).toBe(2);
    });
  });
});
