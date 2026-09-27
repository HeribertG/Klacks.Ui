// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Single entry point for booking one shift into one schedule cell (context menu, drag and drop, typed
 * abbreviation). A fixed shift is booked with its own times; a TimeRange shift first asks for the span
 * inside its window, because StartShift/EndShift are only the permitted window and booking them would bill
 * the whole window. A cancelled dialog books nothing.
 * @param shift - The shift schedule row for the target day
 * @param clientId - The employee the shift is booked for
 * @param date - The planned day (the cell's date)
 */
import { inject, Injectable } from '@angular/core';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { IShiftSchedule } from 'src/app/domain/models/schedule/shift-schedule-class';
import { addDays } from 'src/app/shared/helpers/date.helper';
import { TimeRangeWorkDialogComponent } from '../../dialogs/time-range-work-dialog/time-range-work-dialog.component';

@Injectable()
export class ShiftPlacementService {
  private dataManagement = inject(DataManagementScheduleService);
  private timeRangeDialog: TimeRangeWorkDialogComponent | null = null;

  setTimeRangeDialog(dialog: TimeRangeWorkDialogComponent): void {
    this.timeRangeDialog = dialog;
  }

  async placeShift(shift: IShiftSchedule, clientId: string, date: Date): Promise<void> {
    if (!shift.isTimeRange) {
      await this.dataManagement.addWorkScheduleEntry({
        clientId,
        date,
        shiftId: shift.shiftId,
        workTime: shift.workTime,
        startTime: shift.startShift,
        endTime: shift.endShift,
      });
      return;
    }

    if (!this.timeRangeDialog) return;

    const placement = await this.timeRangeDialog.open({
      shiftName: shift.shiftName,
      windowStart: shift.startShift,
      windowEnd: shift.endShift,
      workTime: shift.workTime,
    });
    if (!placement) return;

    await this.dataManagement.addWorkScheduleEntry({
      clientId,
      date: addDays(date, placement.dayOffset),
      shiftId: shift.shiftId,
      workTime: placement.workTime,
      startTime: placement.startTime,
      endTime: placement.endTime,
    });
  }
}
