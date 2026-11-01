// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { WorkScheduleLoaderService } from './work-schedule-loader.service';
import { DataWorkScheduleService } from 'src/app/infrastructure/api/schedule/data-work-schedule.service';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { CalendarUtilService } from 'src/app/domain/services/calendar-util.service';
import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import { BreakPlaceholderScheduleLoaderService } from './break-placeholder-schedule-loader.service';
import { ScheduleChangeService } from './schedule-change.service';
import { AnalyseScenarioService } from './analyse-scenario.service';
import { DataPeriodClosingService } from 'src/app/infrastructure/api/period-closing/data-period-closing.service';
import { DataBreakService } from 'src/app/infrastructure/api/break/data-break.service';
import { Break } from 'src/app/domain/models/break/break-class';
import { IWorkFilter } from 'src/app/domain/models/schedule/work-filter.interface';
import { IScheduleCell } from 'src/app/domain/models/schedule/schedule-cell.interface';
import { IWorkScheduleResponse } from 'src/app/domain/models/schedule/work-schedule-response.interface';
import { addDays, formatDateOnly } from 'src/app/domain/helpers/date.helper';
import { environment } from 'src/environments/environment';
import {
  activeJanuaryOffsetMinutes,
  CALENDAR_TEST_ZONES,
  expectedJanuaryOffsetMinutes,
  useTimeZone,
} from 'src/app/shared/testing/time-zone.testing';

const RESPONSE_START = '2026-08-03';
const RESPONSE_END = '2026-09-06';

function createWorkFilter(): IWorkFilter {
  return {
    currentMonth: 8,
    currentYear: 2026,
    paymentInterval: 2,
    works: [],
    selectedGroup: undefined,
    searchString: '',
    orderBy: '',
    sortOrder: '',
    numberOfItemsPerPage: 5,
    requiredPage: 0,
    numberOfItemOnPreviousPage: undefined,
    firstItemOnLastPage: undefined,
    isPreviousPage: undefined,
    isNextPage: undefined,
    showEmployees: true,
    showExtern: true,
    individualSort: false,
  };
}

function createEntry(entryDate: string): IScheduleCell {
  return {
    id: `entry-${entryDate}`,
    entryType: 0,
    sourceId: `entry-${entryDate}`,
    clientId: 'client-1',
    entryDate: entryDate as unknown as Date,
    startTime: '08:00:00',
    endTime: '16:00:00',
    changeTime: null,
    surcharges: null,
    workChangeType: null,
    description: null,
    information: null,
    amount: null,
    toInvoice: null,
    taxable: null,
    entryId: 'shift-1',
    entryName: null,
    abbreviation: 'F',
    replaceClientId: null,
    isReplacementEntry: false,
    lockLevel: 0,
    isGroupRestricted: false,
  };
}

function createResponse(entries: IScheduleCell[] = []): IWorkScheduleResponse {
  return {
    entries,
    clients: [],
    periodHours: {},
    clientAvailabilities: {},
    totalClientCount: 0,
    startDate: RESPONSE_START,
    endDate: RESPONSE_END,
  };
}

describe('WorkScheduleLoaderService calendar dates', () => {
  let service: WorkScheduleLoaderService;
  let dataBreakService: DataBreakService;
  let httpTestingController: HttpTestingController;
  let getWorkSchedule: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getWorkSchedule = vi.fn().mockReturnValue(of(createResponse()));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        WorkScheduleLoaderService,
        DataBreakService,
        { provide: DataWorkScheduleService, useValue: { getWorkSchedule, getPeriodHours: vi.fn() } },
        {
          provide: DataManagementSettingsService,
          useValue: {
            appSettings: { workSettings: () => ({ dayVisibleBefore: 2, dayVisibleAfter: 6 }) },
          },
        },
        { provide: DataManagementGroupService, useValue: { flatNodeList: [] } },
        { provide: CalendarUtilService, useValue: {} },
        {
          provide: SCHEDULE_SIGNALR,
          useValue: {
            periodHoursUpdated$: new Subject<never>(),
            periodHoursRecalculated$: new Subject<never>(),
            setSelectedGroup: vi.fn(),
            joinScheduleGroup: vi.fn().mockResolvedValue(undefined),
            leaveScheduleGroup: vi.fn().mockResolvedValue(undefined),
            connectionId: 'test-connection',
          },
        },
        {
          provide: BreakPlaceholderScheduleLoaderService,
          useValue: { visible: false, getMaxBreakPlaceholdersPerClientAndDay: vi.fn() },
        },
        { provide: ScheduleChangeService, useValue: { clear: vi.fn(), loadDirtyClients: vi.fn() } },
        { provide: AnalyseScenarioService, useValue: { activeToken: signal<string | null>(null) } },
        { provide: DataPeriodClosingService, useValue: { getSealedPeriods: vi.fn().mockReturnValue(of([])) } },
      ],
    });

    service = TestBed.inject(WorkScheduleLoaderService);
    dataBreakService = TestBed.inject(DataBreakService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  describe('planning period of the open plan', () => {
    const WEEK_50 = 50;

    beforeEach(() => {
      const calendar = new CalendarUtilService();
      Object.assign(TestBed.inject(CalendarUtilService), {
        getWeekStartDate: calendar.getWeekStartDate.bind(calendar),
        getWeekEndDate: calendar.getWeekEndDate.bind(calendar),
        getBiweeklyStartDate: calendar.getBiweeklyStartDate.bind(calendar),
        getBiweeklyEndDate: calendar.getBiweeklyEndDate.bind(calendar),
      });
    });

    it.each([
      [0, '2026-12-07', '2026-12-13'],
      [1, '2026-11-30', '2026-12-13'],
      [2, '2026-12-01', '2026-12-31'],
      [3, '2026-12-01', '2026-12-31'],
      [4, '2026-12-01', '2026-12-31'],
    ])('payment interval %i runs from %s to %s', (paymentInterval, from, until) => {
      const filter = { ...createWorkFilter(), currentYear: 2026, currentMonth: 12, currentWeek: WEEK_50, paymentInterval };

      expect(formatDateOnly(service.getPeriodStartDate(filter))).toBe(from);
      expect(formatDateOnly(service.getPeriodEndDate(filter))).toBe(until);
    });
  });

  for (const zone of CALENDAR_TEST_ZONES) {
    describe(zone, () => {
      useTimeZone(zone);

      it('activates the configured zone', () => {
        expect(activeJanuaryOffsetMinutes()).toBe(expectedJanuaryOffsetMinutes(zone));
      });

      it('anchors column 0 at local midnight of response.startDate', () => {
        service.load(createWorkFilter());

        expect(service.startDate).not.toBeNull();
        expect(formatDateOnly(service.startDate as Date)).toBe(RESPONSE_START);
        expect((service.startDate as Date).getHours()).toBe(0);
        expect(formatDateOnly(service.endDate as Date)).toBe(RESPONSE_END);
        expect((service.endDate as Date).getHours()).toBe(0);
      });

      it('groups entries by calendar day for DateOnly, UTC-midnight and no-Z entry dates', () => {
        getWorkSchedule.mockReturnValue(of(createResponse([
          createEntry('2026-08-04'),
          createEntry('2026-08-05T00:00:00Z'),
          createEntry('2026-08-06T00:00:00'),
        ])));

        service.load(createWorkFilter());

        expect(service.getWorkScheduleForClientAndDate('client-1', new Date(2026, 7, 4)).length).toBe(1);
        expect(service.getWorkScheduleForClientAndDate('client-1', new Date(2026, 7, 5)).length).toBe(1);
        expect(service.getWorkScheduleForClientAndDate('client-1', new Date(2026, 7, 6)).length).toBe(1);
        expect(service.getWorkScheduleForClientAndDate('client-1', new Date(2026, 7, 3)).length).toBe(0);
      });

      it.each([
        [0, '2026-08-03T00:00:00.000Z'],
        [3, '2026-08-06T00:00:00.000Z'],
        [30, '2026-09-02T00:00:00.000Z'],
      ])('sends a break for column %i as startDate + column (%s)', (column, expectedWire) => {
        service.load(createWorkFilter());
        const breakEntry = new Break();
        breakEntry.clientId = 'client-1';
        breakEntry.currentDate = addDays(service.startDate as Date, column);

        dataBreakService.addBreak(breakEntry).subscribe();

        const req = httpTestingController.expectOne(`${environment.baseUrl}Breaks/`);
        expect(req.request.body.currentDate).toBe(expectedWire);
        req.flush({});
      });
    });
  }
});
