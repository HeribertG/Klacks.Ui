// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import { Subject } from 'rxjs';
import { ShiftSporadic } from 'src/app/domain/enums/shift-sporadic.enum';
import { SporadicStatus } from 'src/app/domain/enums/sporadic-status.enum';
import { IShiftSchedule } from 'src/app/domain/models/schedule/shift-schedule-class';
import { DataShiftScheduleService } from 'src/app/infrastructure/api/schedule/data-shift-schedule.service';
import { AnalyseScenarioService } from './analyse-scenario.service';
import { AvailableShiftsCalculatorService } from './available-shifts-calculator.service';
import { ShiftScheduleLoaderService } from './shift-schedule-loader.service';

const SPORADIC_SHIFT_ID = 'sporadic-shift';
const FIXED_SHIFT_ID = 'fixed-shift';

function row(overrides: Partial<IShiftSchedule>): IShiftSchedule {
  return {
    shiftId: SPORADIC_SHIFT_ID,
    date: new Date(2026, 9, 5),
    dayOfWeek: 1,
    shiftName: 'Sporadic',
    abbreviation: 'SP',
    startShift: '08:00',
    endShift: '16:00',
    workTime: 480,
    isSporadic: true,
    isTimeRange: false,
    shiftType: 0,
    isInTemplateContainer: false,
    sumEmployees: 1,
    quantity: 1,
    sporadicScope: ShiftSporadic.Week,
    engaged: 0,
    sporadicStatus: SporadicStatus.None,
    qualifications: [{ qualificationId: 'q-1', emoji: null, name: { de: 'Q' }, level: 1 } as never],
    ...overrides,
  };
}

describe('ShiftScheduleLoaderService.refreshSporadicShifts', () => {
  let service: ShiftScheduleLoaderService;
  let dataShiftSchedule: { getShiftSchedulePartial: ReturnType<typeof vi.fn>; getShiftSchedule: ReturnType<typeof vi.fn> };
  let availableShiftsCalc: { calculate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    dataShiftSchedule = {
      getShiftSchedulePartial: vi.fn().mockReturnValue(of({ shifts: [], totalCount: 0 })),
      getShiftSchedule: vi.fn().mockReturnValue(of({ shifts: [], totalCount: 0 })),
    };
    availableShiftsCalc = { calculate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        ShiftScheduleLoaderService,
        { provide: DataShiftScheduleService, useValue: dataShiftSchedule },
        { provide: AvailableShiftsCalculatorService, useValue: availableShiftsCalc },
        { provide: AnalyseScenarioService, useValue: { activeToken: () => null } },
        { provide: SCHEDULE_SIGNALR, useValue: { wizard4CandidatesChanged$: new Subject<never>() } },
      ],
    });
    service = TestBed.inject(ShiftScheduleLoaderService);
    service.shiftSchedules = [
      row({ date: new Date(2026, 9, 5) }),
      row({ date: new Date(2026, 9, 6) }),
      row({ date: new Date(2026, 9, 7) }),
      row({ shiftId: FIXED_SHIFT_ID, isSporadic: false, date: new Date(2026, 9, 5) }),
    ];
  });

  it('requests every loaded day of the sporadic shift and nothing of other shifts', async () => {
    await service.refreshSporadicShifts([SPORADIC_SHIFT_ID, FIXED_SHIFT_ID]);

    const filter = dataShiftSchedule.getShiftSchedulePartial.mock.calls[0][0];
    expect(filter.shiftDatePairs).toEqual([
      { shiftId: SPORADIC_SHIFT_ID, date: new Date(2026, 9, 5) },
      { shiftId: SPORADIC_SHIFT_ID, date: new Date(2026, 9, 6) },
      { shiftId: SPORADIC_SHIFT_ID, date: new Date(2026, 9, 7) },
    ]);
  });

  it('does not call the backend when no requested shift is sporadic', async () => {
    await service.refreshSporadicShifts([FIXED_SHIFT_ID]);

    expect(dataShiftSchedule.getShiftSchedulePartial).not.toHaveBeenCalled();
  });

  it('takes engaged and sporadicStatus from the response and keeps the other row fields', async () => {
    dataShiftSchedule.getShiftSchedulePartial.mockReturnValue(
      of({
        shifts: [
          { shiftId: SPORADIC_SHIFT_ID, date: '2026-10-05T00:00:00', engaged: 1, sporadicStatus: SporadicStatus.Booked },
          { shiftId: SPORADIC_SHIFT_ID, date: '2026-10-06T00:00:00', engaged: 0, sporadicStatus: SporadicStatus.Blocked },
        ],
        totalCount: 2,
      }),
    );

    await service.refreshSporadicShifts([SPORADIC_SHIFT_ID]);

    const [monday, tuesday, wednesday, fixed] = service.shiftSchedules;
    expect([monday.engaged, monday.sporadicStatus]).toEqual([1, SporadicStatus.Booked]);
    expect([tuesday.engaged, tuesday.sporadicStatus]).toEqual([0, SporadicStatus.Blocked]);
    expect([wednesday.engaged, wednesday.sporadicStatus]).toEqual([0, SporadicStatus.None]);
    expect(monday.qualifications).toHaveLength(1);
    expect(fixed.sporadicStatus).toBe(SporadicStatus.None);
  });

  it('signals the grid to re-read the rows', async () => {
    const before = service.isRead();
    dataShiftSchedule.getShiftSchedulePartial.mockReturnValue(
      of({ shifts: [{ shiftId: SPORADIC_SHIFT_ID, date: '2026-10-05', engaged: 1, sporadicStatus: SporadicStatus.Booked }], totalCount: 1 }),
    );

    await service.refreshSporadicShifts([SPORADIC_SHIFT_ID]);

    expect(service.isRead()).toBe(before + 1);
  });

  it('keeps the rows and resolves when the backend call fails', async () => {
    dataShiftSchedule.getShiftSchedulePartial.mockReturnValue(throwError(() => new Error('offline')));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(service.refreshSporadicShifts([SPORADIC_SHIFT_ID])).resolves.toBeUndefined();

    expect(service.shiftSchedules[0].sporadicStatus).toBe(SporadicStatus.None);
    errorSpy.mockRestore();
  });
});
