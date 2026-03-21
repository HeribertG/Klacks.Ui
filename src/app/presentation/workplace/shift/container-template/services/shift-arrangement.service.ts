// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, inject } from '@angular/core';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import { TimeRangeService } from 'src/app/presentation/shared/time-ruler/services/time-range.service';
import { formatTimeFromMinutes } from 'src/app/shared/helpers/time-format.helper';

@Injectable()
export class ShiftArrangementService {
  private readonly MINUTES_PER_HOUR = 60;
  private readonly HALF_DIVISOR = 2;

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
    const containerFromTime =
      this.timeRangeService.parseTimeString(containerTimeFrom);

    if (!containerFromTime) {
      return items;
    }

    let currentEffectivePosition =
      containerFromTime.hours * this.MINUTES_PER_HOUR +
      containerFromTime.minutes;

    for (let i = 0; i < items.length; i++) {
      const item = { ...items[i] };

      const isAbsence = !!item.absenceId;
      const isMovable = item.shift?.isTimeRange || item.shift?.isSporadic || isAbsence;

      if (!isMovable) {
        arrangedItems.push(item);
        const endTime = item.endItem
          ? this.timeRangeService.parseTimeString(item.endItem)
          : null;
        if (endTime) {
          const endMinutes = endTime.hours * this.MINUTES_PER_HOUR + endTime.minutes;
          const postShiftTime = this.timeRangeService.getTotalPostShiftMinutes(item);
          currentEffectivePosition = endMinutes + postShiftTime;
        }
        continue;
      }

      const originalStartTime = item.startItem
        ? this.timeRangeService.parseTimeString(item.startItem)
        : null;

      if (!originalStartTime) {
        arrangedItems.push(item);
        continue;
      }

      const originalStartMinutes =
        originalStartTime.hours * this.MINUTES_PER_HOUR +
        originalStartTime.minutes;

      let workTimeMinutes: number;
      if (isAbsence) {
        const endTime = item.endItem
          ? this.timeRangeService.parseTimeString(item.endItem)
          : null;
        const endMinutes = endTime
          ? endTime.hours * this.MINUTES_PER_HOUR + endTime.minutes
          : originalStartMinutes;
        workTimeMinutes = endMinutes - originalStartMinutes;
      } else {
        workTimeMinutes = Math.round(
          (item.shift?.workTime || 0) * this.MINUTES_PER_HOUR
        );
      }

      const preShiftTime = this.timeRangeService.getTotalPreShiftMinutes(item);
      const postShiftTime = this.timeRangeService.getTotalPostShiftMinutes(item);

      let newStartMinutes: number;
      if (i === 0) {
        const originalEffectiveStart = originalStartMinutes - preShiftTime;
        newStartMinutes = Math.max(
          currentEffectivePosition + preShiftTime,
          originalStartMinutes
        );
        if (originalEffectiveStart >= currentEffectivePosition) {
          newStartMinutes = originalStartMinutes;
        }
      } else {
        newStartMinutes = currentEffectivePosition + preShiftTime;
      }

      const newEndMinutes = newStartMinutes + workTimeMinutes;

      if (isAbsence) {
        item.startItem = formatTimeFromMinutes(newStartMinutes);
        item.endItem = formatTimeFromMinutes(newEndMinutes);
      } else {
        item.timeRangeStartItem = formatTimeFromMinutes(newStartMinutes);
        item.timeRangeEndItem = formatTimeFromMinutes(newEndMinutes);
      }

      arrangedItems.push(item);
      currentEffectivePosition = newEndMinutes + postShiftTime;
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

    const isNewItemAbsence = !!newItem.absenceId;
    if (!newItem.shift?.isTimeRange && !newItem.shift?.isSporadic && !isNewItemAbsence) {
      return result;
    }

    const originalStartTime = newItem.startItem
      ? this.timeRangeService.parseTimeString(newItem.startItem)
      : null;
    if (!originalStartTime) {
      return result;
    }

    let workTimeMinutes: number;
    if (isNewItemAbsence) {
      const endTime = newItem.endItem
        ? this.timeRangeService.parseTimeString(newItem.endItem)
        : null;
      const startMins = originalStartTime.hours * this.MINUTES_PER_HOUR + originalStartTime.minutes;
      const endMins = endTime ? endTime.hours * this.MINUTES_PER_HOUR + endTime.minutes : startMins;
      workTimeMinutes = endMins - startMins;
    } else {
      workTimeMinutes = Math.round(
        (newItem.shift?.workTime || 0) * this.MINUTES_PER_HOUR
      );
    }
    const containerFromTime =
      this.timeRangeService.parseTimeString(containerTimeFrom);

    if (!containerFromTime) {
      return result;
    }

    const preShiftTime = this.timeRangeService.getTotalPreShiftMinutes(newItem);
    const postShiftTime = this.timeRangeService.getTotalPostShiftMinutes(newItem);

    const previousItem = newItemIndex > 0 ? result[newItemIndex - 1] : null;
    const nextItem =
      newItemIndex < result.length - 1 ? result[newItemIndex + 1] : null;

    let newStartMinutes: number;
    let newEndMinutes: number;

    if (!previousItem) {
      const containerStartMinutes =
        containerFromTime.hours * this.MINUTES_PER_HOUR +
        containerFromTime.minutes;
      newStartMinutes = containerStartMinutes + preShiftTime;
      newEndMinutes = newStartMinutes + workTimeMinutes;
    } else {
      const prevEffectiveEndMinutes =
        this.timeRangeService.getEffectiveEndMinutes(previousItem);
      newStartMinutes = prevEffectiveEndMinutes + preShiftTime;
      newEndMinutes = newStartMinutes + workTimeMinutes;
    }

    if (nextItem && (nextItem.shift?.isTimeRange || nextItem.shift?.isSporadic)) {
      const nextEffectiveStartMinutes =
        this.timeRangeService.getEffectiveStartMinutes(nextItem);
      const newEffectiveEndMinutes = newEndMinutes + postShiftTime;

      if (newEffectiveEndMinutes > nextEffectiveStartMinutes) {
        const overlap = newEffectiveEndMinutes - nextEffectiveStartMinutes;
        const isPreviousMovable =
          previousItem &&
          (previousItem.shift?.isTimeRange || previousItem.shift?.isSporadic);
        const isNextMovable =
          nextItem.shift?.isTimeRange || nextItem.shift?.isSporadic;

        if (isPreviousMovable && isNextMovable) {
          const halfOverlap = Math.ceil(overlap / this.HALF_DIVISOR);

          const prevStartMinutes = this.timeRangeService.getShiftStartMinutes(previousItem!);
          const prevDuration =
            this.timeRangeService.getShiftEndMinutes(previousItem!) - prevStartMinutes;
          const newPrevEndMinutes = prevStartMinutes + prevDuration - halfOverlap;

          previousItem!.timeRangeStartItem = formatTimeFromMinutes(prevStartMinutes);
          previousItem!.timeRangeEndItem = formatTimeFromMinutes(newPrevEndMinutes);

          const prevPostShiftTime = this.timeRangeService.getTotalPostShiftMinutes(previousItem!);
          newStartMinutes = newPrevEndMinutes + prevPostShiftTime + preShiftTime;
          newEndMinutes = newStartMinutes + workTimeMinutes;

          const nextStartMinutes = this.timeRangeService.getShiftStartMinutes(nextItem);
          const nextDuration =
            this.timeRangeService.getShiftEndMinutes(nextItem) - nextStartMinutes;
          const nextPreShiftTime = this.timeRangeService.getTotalPreShiftMinutes(nextItem);
          const newNextStartMinutes = newEndMinutes + postShiftTime + nextPreShiftTime;
          const newNextEndMinutes = newNextStartMinutes + nextDuration;

          nextItem.timeRangeStartItem = formatTimeFromMinutes(newNextStartMinutes);
          nextItem.timeRangeEndItem = formatTimeFromMinutes(newNextEndMinutes);
        } else if (!isPreviousMovable && isNextMovable) {
          const nextStartMinutes = this.timeRangeService.getShiftStartMinutes(nextItem);
          const nextDuration =
            this.timeRangeService.getShiftEndMinutes(nextItem) - nextStartMinutes;
          const nextPreShiftTime = this.timeRangeService.getTotalPreShiftMinutes(nextItem);
          const newNextStartMinutes = newEndMinutes + postShiftTime + nextPreShiftTime;

          nextItem.timeRangeStartItem = formatTimeFromMinutes(newNextStartMinutes);
          nextItem.timeRangeEndItem = formatTimeFromMinutes(newNextStartMinutes + nextDuration);
        } else if (isPreviousMovable && !isNextMovable) {
          const prevStartMinutes = this.timeRangeService.getShiftStartMinutes(previousItem!);
          const prevDuration =
            this.timeRangeService.getShiftEndMinutes(previousItem!) - prevStartMinutes;
          const newPrevEndMinutes = prevStartMinutes + prevDuration - overlap;

          previousItem!.timeRangeStartItem = formatTimeFromMinutes(prevStartMinutes);
          previousItem!.timeRangeEndItem = formatTimeFromMinutes(newPrevEndMinutes);

          const prevPostShiftTime = this.timeRangeService.getTotalPostShiftMinutes(previousItem!);
          newStartMinutes = newPrevEndMinutes + prevPostShiftTime + preShiftTime;
          newEndMinutes = newStartMinutes + workTimeMinutes;
        }
      }
    }

    if (isNewItemAbsence) {
      newItem.startItem = formatTimeFromMinutes(newStartMinutes);
      newItem.endItem = formatTimeFromMinutes(newEndMinutes);
    } else {
      newItem.timeRangeStartItem = formatTimeFromMinutes(newStartMinutes);
      newItem.timeRangeEndItem = formatTimeFromMinutes(newEndMinutes);
    }

    return result;
  }

  compactShifts(
    items: IContainerTemplateItem[],
    containerTimeFrom: string
  ): IContainerTemplateItem[] {
    if (!items || items.length === 0) {
      return items;
    }

    const containerFromTime =
      this.timeRangeService.parseTimeString(containerTimeFrom);
    if (!containerFromTime) {
      return items;
    }

    const compactedItems: IContainerTemplateItem[] = [];
    let currentEffectivePosition =
      containerFromTime.hours * this.MINUTES_PER_HOUR +
      containerFromTime.minutes;

    for (const item of items) {
      const compactedItem = { ...item };
      const isAbsence = !!item.absenceId;
      const isMovable = item.shift?.isTimeRange || item.shift?.isSporadic || isAbsence;

      let workTimeMinutes: number;
      if (isAbsence) {
        const startMins = this.timeRangeService.getShiftStartMinutes(item);
        const endMins = this.timeRangeService.getShiftEndMinutes(item);
        workTimeMinutes = endMins - startMins;
      } else {
        workTimeMinutes = Math.round(
          (item.shift?.workTime || 0) * this.MINUTES_PER_HOUR
        );
      }

      if (isMovable) {
        const preShiftTime = this.timeRangeService.getTotalPreShiftMinutes(item);
        const postShiftTime = this.timeRangeService.getTotalPostShiftMinutes(item);

        const newStartMinutes = currentEffectivePosition + preShiftTime;
        const newEndMinutes = newStartMinutes + workTimeMinutes;

        if (isAbsence) {
          compactedItem.startItem = formatTimeFromMinutes(newStartMinutes);
          compactedItem.endItem = formatTimeFromMinutes(newEndMinutes);
        } else {
          compactedItem.timeRangeStartItem = formatTimeFromMinutes(newStartMinutes);
          compactedItem.timeRangeEndItem = formatTimeFromMinutes(newEndMinutes);
        }

        currentEffectivePosition = newEndMinutes + postShiftTime;
      } else {
        const endTime = item.endItem
          ? this.timeRangeService.parseTimeString(item.endItem)
          : null;
        if (endTime) {
          const endMinutes = endTime.hours * this.MINUTES_PER_HOUR + endTime.minutes;
          const postShiftTime = this.timeRangeService.getTotalPostShiftMinutes(item);
          currentEffectivePosition = endMinutes + postShiftTime;
        }
      }

      compactedItems.push(compactedItem);
    }

    return compactedItems;
  }
}
