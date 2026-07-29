// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataManagementMonthlyTargetHoursService } from './data-management-monthly-target-hours.service';
import { EVENT_BUS_TOKEN } from '../../interfaces/event-bus.interface';
import { MonthlyTargetHoursApiService } from '../../../infrastructure/api/scheduling/monthly-target-hours-api.service';
import { IMonthlyTargetHours } from '../../models/scheduling/monthly-target-hours.model';

describe('DataManagementMonthlyTargetHoursService', () => {
  const year = 2026;
  const january = 1;

  let service: DataManagementMonthlyTargetHoursService;
  let mockApiService: any;

  const existingJanuary: IMonthlyTargetHours = { id: 'january-id', year, month: january, hours: 184 };

  beforeEach(() => {
    const eventBusSpy = { emit: vi.fn(), on: vi.fn(), onAny: vi.fn() };
    const apiSpy = {
      getAll: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    };
    const translateSpy = { instant: vi.fn().mockImplementation((key: string) => key) };

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        DataManagementMonthlyTargetHoursService,
        { provide: EVENT_BUS_TOKEN, useValue: eventBusSpy },
        { provide: MonthlyTargetHoursApiService, useValue: apiSpy },
        { provide: TranslateService, useValue: translateSpy },
      ],
    });

    service = TestBed.inject(DataManagementMonthlyTargetHoursService);
    mockApiService = TestBed.inject(MonthlyTargetHoursApiService) as any;
  });

  it('creates a row for a month that has a value but no existing row', async () => {
    await service.saveMonth(year, january, 184);

    expect(mockApiService.create).toHaveBeenCalledWith({ year, month: january, hours: 184 });
    expect(mockApiService.update).not.toHaveBeenCalled();
    expect(mockApiService.delete).not.toHaveBeenCalled();
  });

  it('updates an existing row when the value changed', async () => {
    service.monthlyTargetHours = [existingJanuary];

    await service.saveMonth(year, january, 176);

    expect(mockApiService.update).toHaveBeenCalledWith({ ...existingJanuary, hours: 176 });
    expect(mockApiService.create).not.toHaveBeenCalled();
  });

  it('leaves an unchanged row untouched', async () => {
    service.monthlyTargetHours = [existingJanuary];

    await service.saveMonth(year, january, existingJanuary.hours);

    expect(mockApiService.update).not.toHaveBeenCalled();
    expect(mockApiService.create).not.toHaveBeenCalled();
    expect(mockApiService.delete).not.toHaveBeenCalled();
  });

  it('deletes the row when the month was cleared', async () => {
    service.monthlyTargetHours = [existingJanuary];

    await service.saveMonth(year, january, undefined);

    expect(mockApiService.delete).toHaveBeenCalledWith(existingJanuary.id);
    expect(mockApiService.create).not.toHaveBeenCalled();
  });

  it('does nothing for a month that stays empty', async () => {
    await service.saveMonth(year, january, undefined);

    expect(mockApiService.create).not.toHaveBeenCalled();
    expect(mockApiService.update).not.toHaveBeenCalled();
    expect(mockApiService.delete).not.toHaveBeenCalled();
  });

  it('ignores rows of another year', async () => {
    service.monthlyTargetHours = [{ id: 'other-year-id', year: year - 1, month: january, hours: 184 }];

    await service.saveMonth(year, january, 184);

    expect(mockApiService.create).toHaveBeenCalledWith({ year, month: january, hours: 184 });
    expect(mockApiService.update).not.toHaveBeenCalled();
    expect(mockApiService.delete).not.toHaveBeenCalled();
  });

  it('reads the hours of a month, undefined when there is no override', () => {
    service.monthlyTargetHours = [existingJanuary];

    expect(service.hoursOf(year, january)).toBe(184);
    expect(service.hoursOf(year, 2)).toBeUndefined();
    expect(service.hoursOf(year - 1, january)).toBeUndefined();
  });

  it('reports negative hours as a validation error', () => {
    expect(service.validateMonth(year, -1)).toContain('setting.monthlyTargetHours.validation.hoursPositive');
  });

  it('reports an out-of-range year as a validation error', () => {
    expect(service.validateMonth(1800, 184)).toContain('setting.monthlyTargetHours.validation.invalidYear');
  });

  it('accepts a valid month without a value', () => {
    expect(service.validateMonth(year, undefined)).toEqual([]);
  });
});
