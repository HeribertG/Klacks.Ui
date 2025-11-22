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

  insertItemWithMinimalRepositioning(
    items: IContainerTemplateItem[],
    newItemIndex: number,
    containerTimeFrom: string,
    containerTimeUntil: string
  ): IContainerTemplateItem[] {
    if (!items || items.length === 0) {
      return items;
    }

    const result = [...items];
    const newItem = result[newItemIndex];

    if (!newItem.shift?.isTimeRange && !newItem.shift?.isSporadic) {
      return result;
    }

    const originalStartTime = newItem.startShift ? this.timeRangeService.parseTimeString(newItem.startShift) : null;
    if (!originalStartTime) {
      return result;
    }

    const workTimeMinutes = Math.round((newItem.shift?.workTime || 0) * 60);
    const containerFromTime = this.timeRangeService.parseTimeString(containerTimeFrom);

    if (!containerFromTime) {
      return result;
    }

    const previousItem = newItemIndex > 0 ? result[newItemIndex - 1] : null;
    const nextItem = newItemIndex < result.length - 1 ? result[newItemIndex + 1] : null;

    let newStartMinutes: number;
    let newEndMinutes: number;

    if (!previousItem) {
      const containerStartMinutes = containerFromTime.hours * 60 + containerFromTime.minutes;
      newStartMinutes = containerStartMinutes;
      newEndMinutes = newStartMinutes + workTimeMinutes;
    } else {
      const prevEndMinutes = this.timeRangeService.getShiftEndMinutes(previousItem);
      newStartMinutes = prevEndMinutes;
      newEndMinutes = newStartMinutes + workTimeMinutes;
    }

    if (nextItem) {
      const nextStartMinutes = this.timeRangeService.getShiftStartMinutes(nextItem);

      if (newEndMinutes > nextStartMinutes) {
        const overlap = newEndMinutes - nextStartMinutes;
        const isPreviousMovable = previousItem && (previousItem.shift?.isTimeRange || previousItem.shift?.isSporadic);
        const isNextMovable = nextItem.shift?.isTimeRange || nextItem.shift?.isSporadic;

        if (isPreviousMovable && isNextMovable) {
          const halfOverlap = Math.ceil(overlap / 2);

          const prevStartMinutes = this.timeRangeService.getShiftStartMinutes(previousItem!);
          const prevDuration = this.timeRangeService.getShiftEndMinutes(previousItem!) - prevStartMinutes;
          const newPrevEndMinutes = prevStartMinutes + prevDuration - halfOverlap;

          previousItem!.timeRangeStartShift = this.minutesToTimeString(prevStartMinutes);
          previousItem!.timeRangeEndShift = this.minutesToTimeString(newPrevEndMinutes);

          newStartMinutes = newPrevEndMinutes;
          newEndMinutes = newStartMinutes + workTimeMinutes;

          const nextDuration = this.timeRangeService.getShiftEndMinutes(nextItem) - nextStartMinutes;
          const newNextStartMinutes = newEndMinutes;
          const newNextEndMinutes = newNextStartMinutes + nextDuration;

          nextItem.timeRangeStartShift = this.minutesToTimeString(newNextStartMinutes);
          nextItem.timeRangeEndShift = this.minutesToTimeString(newNextEndMinutes);
        } else if (!isPreviousMovable && isNextMovable) {
          nextItem.timeRangeStartShift = this.minutesToTimeString(newEndMinutes);
          const nextDuration = this.timeRangeService.getShiftEndMinutes(nextItem) - nextStartMinutes;
          nextItem.timeRangeEndShift = this.minutesToTimeString(newEndMinutes + nextDuration);
        } else if (isPreviousMovable && !isNextMovable) {
          const prevStartMinutes = this.timeRangeService.getShiftStartMinutes(previousItem!);
          const prevDuration = this.timeRangeService.getShiftEndMinutes(previousItem!) - prevStartMinutes;
          const newPrevEndMinutes = prevStartMinutes + prevDuration - overlap;

          previousItem!.timeRangeStartShift = this.minutesToTimeString(prevStartMinutes);
          previousItem!.timeRangeEndShift = this.minutesToTimeString(newPrevEndMinutes);

          newStartMinutes = newPrevEndMinutes;
          newEndMinutes = newStartMinutes + workTimeMinutes;
        }
      }
    }

    newItem.timeRangeStartShift = this.minutesToTimeString(newStartMinutes);
    newItem.timeRangeEndShift = this.minutesToTimeString(newEndMinutes);

    return result;
  }

  private minutesToTimeString(totalMinutes: number): string {
    const normalizedMinutes = totalMinutes % (24 * 60);
    const hours = Math.floor(normalizedMinutes / 60);
    const minutes = normalizedMinutes % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  }
}
