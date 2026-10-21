// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { ContainerWorkChildrenService } from 'src/app/domain/services/schedule/container-work-children.service';
import { WorkScheduleLoaderService } from 'src/app/domain/services/schedule/work-schedule-loader.service';
import { DataAbsenceService } from 'src/app/infrastructure/api/absence/data-absence.service';
import { DataContainerTemplateService } from 'src/app/infrastructure/api/container/data-container-template.service';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';
import { ContainerTemplateRouteService } from 'src/app/presentation/workplace/shift/container-template/services/container-template-route.service';
import { ContainerWorkModalLifecycleService } from './container-work-modal-lifecycle.service';

const CONTAINER_ID = 'container-1';
const IS_HOLIDAY_ARG = 6;
const IS_WEEKDAY_AND_HOLIDAY_ARG = 7;
const HOLIDAY_WEDNESDAY = new Date(2026, 11, 23);

describe('ContainerWorkModalLifecycleService available-task slot', () => {
  let container: Partial<IShift>;
  let getAvailableTasks: ReturnType<typeof vi.fn>;
  let getShift: ReturnType<typeof vi.fn>;
  let service: ContainerWorkModalLifecycleService;

  const slotSent = (isHoliday: boolean): [unknown, unknown] => {
    service.initialize({
      workId: 'work-1',
      shiftId: CONTAINER_ID,
      currentDate: HOLIDAY_WEDNESDAY,
      availableShifts: [],
      isHoliday,
    });
    const args = getAvailableTasks.mock.calls.at(-1) ?? [];
    return [args[IS_HOLIDAY_ARG], args[IS_WEEKDAY_AND_HOLIDAY_ARG]];
  };

  beforeEach(() => {
    getAvailableTasks = vi.fn(() => of([]));
    getShift = vi.fn(() => of(container));
    TestBed.configureTestingModule({
      providers: [
        ContainerWorkModalLifecycleService,
        {
          provide: ContainerWorkChildrenService,
          useValue: { loadChildren: () => of({ subWorks: [], subBreaks: [], subWorkChanges: [] }) },
        },
        { provide: ContainerTemplateRouteService, useValue: {} },
        { provide: DataShiftService, useValue: { getShift, getShiftsByIds: () => of([]) } },
        { provide: DataAbsenceService, useValue: { readAbsenceList: () => of([]) } },
        { provide: DataContainerTemplateService, useValue: { getAvailableTasks } },
        { provide: WorkScheduleLoaderService, useValue: {} },
      ],
    });
    service = TestBed.inject(ContainerWorkModalLifecycleService);
  });

  it('sends the normal slot on a normal day without loading the container', () => {
    container = { isHoliday: true, isWeekdayAndHoliday: false };

    expect(slotSent(false)).toEqual([false, false]);
    expect(getShift).not.toHaveBeenCalled();
  });

  it('sends the generic holiday slot of an FT container on a holiday', () => {
    container = { isHoliday: true, isWeekdayAndHoliday: false };

    expect(slotSent(true)).toEqual([true, false]);
    expect(service.holidaySlot).toEqual({ isHoliday: true, isWeekdayAndHoliday: false });
  });

  it('allows the autofill on a normal day once the available tasks are loaded', () => {
    slotSent(false);

    expect(service.canAutofill()).toBe(true);
  });

  it('blocks the autofill while the container of a holiday is still loading', () => {
    getShift.mockReturnValue(NEVER);

    slotSent(true);

    expect(service.canAutofill()).toBe(false);
  });

  it('blocks the autofill and lists the generic holiday slot when the container cannot be loaded', () => {
    getShift.mockReturnValue(throwError(() => new Error('offline')));

    expect(slotSent(true)).toEqual([true, false]);
    expect(service.canAutofill()).toBe(false);
  });

  it('allows the autofill on a holiday once the container slot is resolved', () => {
    container = { isHoliday: false, isWeekdayAndHoliday: true };

    slotSent(true);

    expect(service.canAutofill()).toBe(true);
  });

  it('sends the holiday slot of the weekday of a +FT container on a holiday', () => {
    container = { isHoliday: false, isWeekdayAndHoliday: true };

    expect(slotSent(true)).toEqual([true, true]);
    expect(getShift).toHaveBeenCalledWith(CONTAINER_ID);
  });
});
