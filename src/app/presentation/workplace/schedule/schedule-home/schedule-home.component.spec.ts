// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';
import { ScheduleHomeComponent } from './schedule-home.component';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { DataCalendarSelectionService } from 'src/app/infrastructure/api/calendar/data-calendar-selection.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AllScheduleStateService } from '../services/all-schedule-state.service';
import { SignalRService } from 'src/app/infrastructure/signalr/signalr.service';
import { SchedulePdfExportService } from '../schedule-section/services/schedule-pdf-export.service';
import { TimelinePdfExportService } from '../schedule-section/services/timeline-pdf-export.service';
import { ScheduleViewModeService } from '../services/schedule-view-mode.service';
import { DataGroupService } from 'src/app/infrastructure/api/group/data-group.service';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { SearchStateService } from 'src/app/application/services/search-state.service';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { CALENDAR_TEST_ZONES, currentTimeZone, useTimeZone } from 'src/app/shared/testing/time-zone.testing';

describe('ScheduleHomeComponent', () => {
  const clientId = '131e24fe-2acf-4bd5-b70c-5af888321338';

  let component: ScheduleHomeComponent;
  let workFilter: { searchString: string; selectedGroup: string | undefined };
  let mockDataClientService: any;
  let mockGroupSelectionService: any;
  let mockSearchStateService: any;
  let queryParamMap$: BehaviorSubject<any>;
  let activatedRoute: any;

  function navigateTo(queryParams: Record<string, string>): void {
    activatedRoute.snapshot.queryParamMap = convertToParamMap(queryParams);
    queryParamMap$.next(activatedRoute.snapshot.queryParamMap);
  }

  function setup(queryParams: Record<string, string>): void {
    workFilter = { searchString: '', selectedGroup: 'a-group-outside-the-drift-client' };
    mockDataClientService = { getClient: vi.fn() };
    mockGroupSelectionService = { clearSelection: vi.fn(), selectedGroup: undefined };
    mockSearchStateService = { setRestoreSearch: vi.fn() };

    queryParamMap$ = new BehaviorSubject<any>(convertToParamMap(queryParams));
    activatedRoute = {
      snapshot: { queryParamMap: convertToParamMap(queryParams) },
      queryParamMap: queryParamMap$.asObservable(),
    };

    TestBed.configureTestingModule({
      providers: [
        ScheduleHomeComponent,
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: DataClientService, useValue: mockDataClientService },
        { provide: GroupSelectionService, useValue: mockGroupSelectionService },
        { provide: SearchStateService, useValue: mockSearchStateService },
        { provide: DataManagementScheduleService, useValue: { workFilter, readDatas: vi.fn() } },
        { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn(), detectChanges: vi.fn() } },
        { provide: SavebarService, useValue: {} },
        { provide: LayoutService, useValue: {} },
        { provide: SearchService, useValue: {} },
        { provide: WorkplaceStateService, useValue: {} },
        { provide: HolidayCollectionService, useValue: {} },
        { provide: DataCalendarSelectionService, useValue: {} },
        { provide: AppSettingsManagementService, useValue: {} },
        { provide: AllScheduleStateService, useValue: {} },
        { provide: SignalRService, useValue: {} },
        { provide: SchedulePdfExportService, useValue: {} },
        { provide: TimelinePdfExportService, useValue: {} },
        { provide: ScheduleViewModeService, useValue: {} },
        { provide: DataGroupService, useValue: {} },
        { provide: AnalyseScenarioService, useValue: { isScenarioMode: () => false } },
      ],
    });

    component = TestBed.inject(ScheduleHomeComponent);
  }

  async function applyClientQueryParam(): Promise<void> {
    await (component as unknown as { applyClientQueryParam(): Promise<void> }).applyClientQueryParam();
  }

  describe('applyClientQueryParam', () => {
    it('should scope the schedule to the id number of the client in the query param', async () => {
      // Arrange
      setup({ clientId });
      mockDataClientService.getClient.mockReturnValue(of({ idNumber: 1148, name: 'Ackermann', firstName: 'Clara' }));

      // Act
      await applyClientQueryParam();

      // Assert
      expect(mockDataClientService.getClient).toHaveBeenCalledWith(clientId);
      expect(workFilter.searchString).toBe('1148');
      expect(mockSearchStateService.setRestoreSearch).toHaveBeenCalledWith('1148');
    });

    it('should drop the group selection so a client outside it still surfaces', async () => {
      // Arrange
      setup({ clientId });
      mockDataClientService.getClient.mockReturnValue(of({ idNumber: 1148, name: 'Ackermann', firstName: 'Clara' }));

      // Act
      await applyClientQueryParam();

      // Assert
      expect(mockGroupSelectionService.clearSelection).toHaveBeenCalled();
      expect(workFilter.selectedGroup).toBeUndefined();
    });

    it('should leave the filter untouched without a clientId query param', async () => {
      // Arrange
      setup({ groupId: 'some-group' });

      // Act
      await applyClientQueryParam();

      // Assert
      expect(mockDataClientService.getClient).not.toHaveBeenCalled();
      expect(workFilter.searchString).toBe('');
      expect(mockSearchStateService.setRestoreSearch).not.toHaveBeenCalled();
    });

    it('should fall back to the unfiltered schedule when the client cannot be read', async () => {
      // Arrange
      setup({ clientId });
      mockDataClientService.getClient.mockReturnValue(throwError(() => new Error('403')));

      // Act
      await applyClientQueryParam();

      // Assert
      expect(workFilter.searchString).toBe('');
      expect(mockSearchStateService.setRestoreSearch).not.toHaveBeenCalled();
    });
  });

  describe('a second one-click action while the page stays open', () => {
    async function setupReaction(): Promise<void> {
      setup({ clientId });
      mockDataClientService.getClient.mockReturnValue(of({ idNumber: 1148, name: 'Ackermann', firstName: 'Clara' }));
      await applyClientQueryParam();
      (component as unknown as { setupActionQueryParamReaction(): void }).setupActionQueryParamReaction();
    }

    it('scopes the schedule to the client of the next message', async () => {
      // Arrange
      await setupReaction();
      mockDataClientService.getClient.mockReturnValue(of({ idNumber: 4711, name: 'Koch', firstName: 'Isabella' }));

      // Act
      navigateTo({ clientId: 'second-client-id' });
      await Promise.resolve();
      await Promise.resolve();

      // Assert
      expect(mockDataClientService.getClient).toHaveBeenLastCalledWith('second-client-id');
      expect(workFilter.searchString).toBe('4711');
      expect(mockSearchStateService.setRestoreSearch).toHaveBeenLastCalledWith('4711');
    });

    it('leaves the filter alone when the next navigation carries no action params', async () => {
      // Arrange
      await setupReaction();
      mockDataClientService.getClient.mockClear();

      // Act
      navigateTo({});
      await Promise.resolve();

      // Assert
      expect(mockDataClientService.getClient).not.toHaveBeenCalled();
      expect(workFilter.searchString).toBe('1148');
    });
  });

  describe('applyDateQueryParam', () => {
    const groupId = 'b2f0c1aa-0000-4000-8000-000000000001';

    function setupDate(queryParams: Record<string, string>, groupInterval: number | undefined, filterInterval = 2): any {
      setup(queryParams);
      mockGroupSelectionService.selectedGroup = groupInterval === undefined
        ? undefined
        : { id: groupId, paymentInterval: groupInterval };
      Object.assign(workFilter, { paymentInterval: filterInterval, currentMonth: 1, currentYear: 2020, currentWeek: 1 });
      return workFilter;
    }

    function applyDateQueryParam(): void {
      (component as unknown as { applyDateQueryParam(): void }).applyDateQueryParam();
    }

    for (const zone of CALENDAR_TEST_ZONES) {
      describe(zone, () => {
        useTimeZone(zone);

        it('opens the month of the date for a monthly group', () => {
          // Arrange
          const filter = setupDate({ groupId, date: '2026-10-19' }, 2);

          // Act
          applyDateQueryParam();

          // Assert
          expect(filter.paymentInterval).toBe(2);
          expect(filter.currentMonth).toBe(10);
          expect(filter.currentYear).toBe(2026);
        });

        it('opens the ISO week of the date for a weekly group, across the year boundary', () => {
          // Arrange
          const filter = setupDate({ groupId, date: '2027-01-01' }, 0);

          // Act
          applyDateQueryParam();

          // Assert
          expect(filter.paymentInterval).toBe(0);
          expect(filter.currentWeek).toBe(53);
          expect(filter.currentYear).toBe(2026);
        });
      });
    }

    it('opens the ISO week of the date for a biweekly group', () => {
      // Arrange
      const filter = setupDate({ groupId, date: '2026-10-19' }, 1);

      // Act
      applyDateQueryParam();

      // Assert
      expect(filter.currentWeek).toBe(43);
      expect(filter.currentYear).toBe(2026);
    });

    it('treats a monthly-target-hours group as monthly', () => {
      // Arrange
      const filter = setupDate({ groupId, date: '2026-12-31' }, 4);

      // Act
      applyDateQueryParam();

      // Assert
      expect(filter.currentMonth).toBe(12);
      expect(filter.currentYear).toBe(2026);
    });

    it('keeps the interval of the filter when no group is selected', () => {
      // Arrange
      const filter = setupDate({ date: '2026-03-04' }, undefined, 0);

      // Act
      applyDateQueryParam();

      // Assert
      expect(filter.paymentInterval).toBe(0);
      expect(filter.currentWeek).toBe(10);
      expect(filter.currentYear).toBe(2026);
    });

    it('leaves the period untouched without a date', () => {
      // Arrange
      const filter = setupDate({ groupId }, 2);

      // Act
      applyDateQueryParam();

      // Assert
      expect(filter.currentMonth).toBe(1);
      expect(filter.currentYear).toBe(2020);
    });

    it('leaves the period untouched for a malformed date', () => {
      // Arrange
      const filter = setupDate({ groupId, date: 'not-a-date' }, 2);

      // Act
      applyDateQueryParam();

      // Assert
      expect(filter.currentMonth).toBe(1);
      expect(filter.currentYear).toBe(2020);
    });

    it('re-applies the date of the next message while the page stays open', async () => {
      // Arrange
      const filter = setupDate({}, 2);
      (component as unknown as { setupActionQueryParamReaction(): void }).setupActionQueryParamReaction();
      const dataManagement = TestBed.inject(DataManagementScheduleService) as unknown as { readDatas: ReturnType<typeof vi.fn> };

      // Act
      navigateTo({ groupId, date: '2026-11-03' });
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert
      expect(filter.currentMonth).toBe(11);
      expect(filter.currentYear).toBe(2026);
      expect(dataManagement.readDatas).toHaveBeenCalled();
    });
  });

  describe('updateHolidayDates', () => {
    const ZONES = ['Asia/Kolkata', 'America/New_York'] as const;

    for (const zone of ZONES) {
      describe(zone, () => {
        let originalTz: string | undefined;

        beforeEach(() => {
          originalTz = currentTimeZone();
          process.env['TZ'] = zone;
        });

        afterEach(() => {
          process.env['TZ'] = originalTz;
        });

        it('stores holiday dates as local midnight regardless of the browser zone', () => {
          // Arrange
          setup({});
          const holidayCollectionMock = TestBed.inject(HolidayCollectionService) as unknown as { holidays: { holidayList: { currentDate: Date }[] } };
          holidayCollectionMock.holidays = { holidayList: [{ currentDate: new Date(2026, 0, 1) }] };
          const dataManagementScheduleMock = TestBed.inject(DataManagementScheduleService) as unknown as { holidayDates: Date[] };

          // Act
          (component as unknown as { updateHolidayDates(): void }).updateHolidayDates();

          // Assert
          const [holiday] = dataManagementScheduleMock.holidayDates;
          expect(holiday.getFullYear()).toBe(2026);
          expect(holiday.getMonth()).toBe(0);
          expect(holiday.getDate()).toBe(1);
          expect(holiday.getHours()).toBe(0);
        });
      });
    }
  });
});
