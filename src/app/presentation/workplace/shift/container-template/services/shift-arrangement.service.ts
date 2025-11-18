import { Injectable, inject } from '@angular/core';
import { IShift } from 'src/app/domain/models/shift-class';
import { OwnTime } from 'src/app/domain/models/schedule-class';
import { TimeRangeService } from 'src/app/presentation/shared/time-ruler/services/time-range.service';

@Injectable({
  providedIn: 'root',
})
export class ShiftArrangementService {
  private timeRangeService = inject(TimeRangeService);
  arrangeShifts(
    shifts: IShift[],
    containerTimeFrom: string,
    containerTimeUntil: string
  ): IShift[] {
    if (!shifts || shifts.length === 0) {
      return shifts;
    }

    const arrangedShifts: IShift[] = [];
    const containerFromTime = this.timeRangeService.parseTimeString(containerTimeFrom);

    if (!containerFromTime) {
      return shifts;
    }

    let currentStartMinutes = containerFromTime.hours * 60 + containerFromTime.minutes;

    for (let i = 0; i < shifts.length; i++) {
      const shift = { ...shifts[i] };

      if (!shift.isTimeRange && !shift.isSporadic) {
        arrangedShifts.push(shift);
        const endTime = this.timeRangeService.parseTimeString(shift.endShift);
        if (endTime) {
          currentStartMinutes = endTime.hours * 60 + endTime.minutes;
        }
        continue;
      }

      const originalStartTime = this.timeRangeService.parseTimeString(shift.startShift);

      if (!originalStartTime) {
        arrangedShifts.push(shift);
        continue;
      }

      const originalStartMinutes = originalStartTime.hours * 60 + originalStartTime.minutes;
      const workTimeMinutes = Math.round(shift.workTime * 60);

      let newStartMinutes: number;
      if (i === 0) {
        newStartMinutes = Math.max(currentStartMinutes, originalStartMinutes);
      } else {
        newStartMinutes = currentStartMinutes;
      }

      const newEndMinutes = newStartMinutes + workTimeMinutes;

      shift.timeRangeStartShift = this.minutesToTimeString(newStartMinutes);
      shift.timeRangeEndShift = this.minutesToTimeString(newEndMinutes);

      arrangedShifts.push(shift);
      currentStartMinutes = newEndMinutes;
    }

    return arrangedShifts;
  }

  private minutesToTimeString(totalMinutes: number): string {
    const normalizedMinutes = totalMinutes % (24 * 60);
    const hours = Math.floor(normalizedMinutes / 60);
    const minutes = normalizedMinutes % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  }
}
