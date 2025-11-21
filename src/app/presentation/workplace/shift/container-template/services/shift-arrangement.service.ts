import { Injectable, inject } from '@angular/core';
import { IContainerTemplateItem } from 'src/app/domain/models/container-template-class';
import { OwnTime } from 'src/app/domain/models/schedule-class';
import { TimeRangeService } from 'src/app/presentation/shared/time-ruler/services/time-range.service';

@Injectable({
  providedIn: 'root',
})
export class ShiftArrangementService {
  private timeRangeService = inject(TimeRangeService);
  arrangeShifts(
    items: IContainerTemplateItem[],
    containerTimeFrom: string,
    containerTimeUntil: string
  ): IContainerTemplateItem[] {
    if (!items || items.length === 0) {
      return items;
    }

    const arrangedItems: IContainerTemplateItem[] = [];
    const containerFromTime = this.timeRangeService.parseTimeString(containerTimeFrom);

    if (!containerFromTime) {
      return items;
    }

    let currentStartMinutes = containerFromTime.hours * 60 + containerFromTime.minutes;

    for (let i = 0; i < items.length; i++) {
      const item = { ...items[i] };

      if (!item.shift?.isTimeRange && !item.shift?.isSporadic) {
        arrangedItems.push(item);
        const endTime = item.endShift ? this.timeRangeService.parseTimeString(item.endShift) : null;
        if (endTime) {
          currentStartMinutes = endTime.hours * 60 + endTime.minutes;
        }
        continue;
      }

      const originalStartTime = item.startShift ? this.timeRangeService.parseTimeString(item.startShift) : null;

      if (!originalStartTime) {
        arrangedItems.push(item);
        continue;
      }

      const originalStartMinutes = originalStartTime.hours * 60 + originalStartTime.minutes;
      const workTimeMinutes = Math.round((item.shift?.workTime || 0) * 60);

      let newStartMinutes: number;
      if (i === 0) {
        newStartMinutes = Math.max(currentStartMinutes, originalStartMinutes);
      } else {
        newStartMinutes = currentStartMinutes;
      }

      const newEndMinutes = newStartMinutes + workTimeMinutes;

      item.timeRangeStartShift = this.minutesToTimeString(newStartMinutes);
      item.timeRangeEndShift = this.minutesToTimeString(newEndMinutes);

      arrangedItems.push(item);
      currentStartMinutes = newEndMinutes;
    }

    return arrangedItems;
  }

  private minutesToTimeString(totalMinutes: number): string {
    const normalizedMinutes = totalMinutes % (24 * 60);
    const hours = Math.floor(normalizedMinutes / 60);
    const minutes = normalizedMinutes % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  }
}
