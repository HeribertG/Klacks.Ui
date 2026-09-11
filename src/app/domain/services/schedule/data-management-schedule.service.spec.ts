// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DataManagementScheduleService } from './data-management-schedule.service';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { BreakPlaceholderScheduleLoaderService } from './break-placeholder-schedule-loader.service';
import { ShiftScheduleLoaderService } from './shift-schedule-loader.service';
import { WorkScheduleLoaderService } from './work-schedule-loader.service';
import { DataManagementWorkService } from '../work/data-management-work.service';
import { AvailableShiftsCalculatorService } from './available-shifts-calculator.service';
import { ScheduleEntryCrudService } from './schedule-entry-crud.service';
import { AnalyseScenarioService } from './analyse-scenario.service';
import { ClientSortPreferenceService } from './client-sort-preference.service';
import { AssistantPageContextService } from '../assistant/assistant-page-context.service';
import { setCompanyTimeZone } from 'src/app/shared/helpers/calendar-date.helper';
import { useTimeZone } from 'src/app/shared/testing/time-zone.testing';

describe('DataManagementScheduleService default period', () => {
  useTimeZone('America/New_York');

  const NEW_YEAR_EVE_UTC = '2025-12-31T20:00:00Z';
  let service: DataManagementScheduleService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NEW_YEAR_EVE_UTC));

    TestBed.configureTestingModule({
      providers: [
        DataManagementScheduleService,
        { provide: MANAGEABLE_SERVICE_REGISTRY_TOKEN, useValue: { register: vi.fn() } },
        { provide: BreakPlaceholderScheduleLoaderService, useValue: { isLoaded: signal(false) } },
        { provide: ShiftScheduleLoaderService, useValue: { isRead: signal(0) } },
        { provide: WorkScheduleLoaderService, useValue: {} },
        { provide: DataManagementWorkService, useValue: {} },
        { provide: AvailableShiftsCalculatorService, useValue: {} },
        {
          provide: ScheduleEntryCrudService,
          useValue: { scheduleRefreshed: signal(false), shiftScheduleRefreshed: signal(false) },
        },
        { provide: AnalyseScenarioService, useValue: { activeToken: signal(null) } },
        { provide: ClientSortPreferenceService, useValue: {} },
        { provide: AssistantPageContextService, useValue: {} },
      ],
    });
    service = TestBed.inject(DataManagementScheduleService);
  });

  afterEach(() => {
    vi.useRealTimers();
    setCompanyTimeZone(null);
  });

  it('starts with the browser-zone month when the singleton is created before the company zone is known', () => {
    expect(service.workFilter.currentYear).toBe(2025);
    expect(service.workFilter.currentMonth).toBe(12);
  });

  it('moves the untouched default period to the company "today" once the company zone is known', () => {
    setCompanyTimeZone('Pacific/Auckland');

    service.applyCompanyDefaultPeriod();

    expect(service.workFilter.currentYear).toBe(2026);
    expect(service.workFilter.currentMonth).toBe(1);
  });

  it('keeps a period the user has already chosen', () => {
    service.workFilter.currentMonth = 10;
    setCompanyTimeZone('Pacific/Auckland');

    service.applyCompanyDefaultPeriod();

    expect(service.workFilter.currentYear).toBe(2025);
    expect(service.workFilter.currentMonth).toBe(10);
  });

  it('keeps a period the user chose after an earlier default refresh', () => {
    setCompanyTimeZone('Pacific/Auckland');
    service.applyCompanyDefaultPeriod();
    service.workFilter.currentMonth = 3;

    service.applyCompanyDefaultPeriod();

    expect(service.workFilter.currentYear).toBe(2026);
    expect(service.workFilter.currentMonth).toBe(3);
  });
});
