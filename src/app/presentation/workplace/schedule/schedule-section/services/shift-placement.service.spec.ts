// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { IShiftSchedule, ShiftSchedule } from 'src/app/domain/models/schedule/shift-schedule-class';
import { TimeRangeWorkDialogComponent } from '../../dialogs/time-range-work-dialog/time-range-work-dialog.component';
import { ShiftPlacementService } from './shift-placement.service';

const PLANNED_DAY = new Date(2025, 0, 1);

function createShift(isTimeRange: boolean): IShiftSchedule {
  const shift = new ShiftSchedule();
  shift.shiftId = 'shift-1';
  shift.shiftName = 'Bereitschaft';
  shift.startShift = isTimeRange ? '00:00:00' : '08:00:00';
  shift.endShift = isTimeRange ? '00:00:00' : '16:00:00';
  shift.workTime = 8;
  shift.isTimeRange = isTimeRange;
  return shift;
}

describe('ShiftPlacementService', () => {
  let service: ShiftPlacementService;
  let addWorkScheduleEntry: ReturnType<typeof vi.fn>;
  let dialog: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    addWorkScheduleEntry = vi.fn().mockResolvedValue(undefined);
    dialog = { open: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        ShiftPlacementService,
        { provide: DataManagementScheduleService, useValue: { addWorkScheduleEntry } },
      ],
    });

    service = TestBed.inject(ShiftPlacementService);
    service.setTimeRangeDialog(dialog as unknown as TimeRangeWorkDialogComponent);
  });

  it('books a fixed shift directly with its own times, without a dialog', async () => {
    await service.placeShift(createShift(false), 'client-1', PLANNED_DAY);

    expect(dialog.open).not.toHaveBeenCalled();
    expect(addWorkScheduleEntry).toHaveBeenCalledWith({
      clientId: 'client-1',
      date: PLANNED_DAY,
      shiftId: 'shift-1',
      workTime: 8,
      startTime: '08:00:00',
      endTime: '16:00:00',
    });
  });

  it('asks for the span of a TimeRange shift and books only the chosen span', async () => {
    dialog.open.mockResolvedValue({ startTime: '08:00:00', endTime: '16:00:00', workTime: 8, dayOffset: 0 });

    await service.placeShift(createShift(true), 'client-1', PLANNED_DAY);

    expect(dialog.open).toHaveBeenCalledWith({
      shiftName: 'Bereitschaft',
      windowStart: '00:00:00',
      windowEnd: '00:00:00',
      workTime: 8,
    });
    expect(addWorkScheduleEntry).toHaveBeenCalledWith({
      clientId: 'client-1',
      date: PLANNED_DAY,
      shiftId: 'shift-1',
      workTime: 8,
      startTime: '08:00:00',
      endTime: '16:00:00',
    });
  });

  it('books nothing when the TimeRange dialog is cancelled', async () => {
    dialog.open.mockResolvedValue(null);

    await service.placeShift(createShift(true), 'client-1', PLANNED_DAY);

    expect(addWorkScheduleEntry).not.toHaveBeenCalled();
  });

  it('dates a start after midnight inside a wrapping window on the next day', async () => {
    dialog.open.mockResolvedValue({ startTime: '02:00:00', endTime: '05:00:00', workTime: 3, dayOffset: 1 });

    await service.placeShift(createShift(true), 'client-1', PLANNED_DAY);

    const booked = addWorkScheduleEntry.mock.calls[0][0] as { date: Date };
    expect(booked.date.getFullYear()).toBe(2025);
    expect(booked.date.getMonth()).toBe(0);
    expect(booked.date.getDate()).toBe(2);
  });
});
