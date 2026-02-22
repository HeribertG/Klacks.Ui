// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import { TransportModeEnum } from 'src/app/domain/enums/transport-mode.enum';
import { TimeRangeService } from 'src/app/presentation/shared/time-ruler/services/time-range.service';
import {
  formatTimeFromMinutes,
  timeToMinutes,
} from 'src/app/shared/helpers/time-format.helper';

export interface ItemTimeChange {
  timeRangeStartShift?: string;
  briefingTime?: string;
  debriefingTime?: string;
  travelTimeBefore?: string;
  travelTimeAfter?: string;
  transportMode?: TransportModeEnum;
}

export interface RouteOptimizationData {
  optimizedRoute: {
    shiftId: string;
    travelTimeToNext: string;
    transportMode?: TransportModeEnum;
  }[];
  travelTimeFromStartBase: string;
  travelTimeToEndBase: string;
  distanceToEndBaseKm: number;
}

@Injectable()
export class ContainerTemplateItemManipulationService {
  private timeRangeService = inject(TimeRangeService);

  private readonly MINUTES_PER_DAY = 24 * 60;
  private readonly MIN_TRAVEL_TIME_BY_CAR = 5;
  private readonly MIN_TRAVEL_TIME_BY_BICYCLE = 3;
  private readonly MIN_TRAVEL_TIME_BY_FOOT = 1;

  applyTimeChanges(
    targetItem: IContainerTemplateItem,
    changes: ItemTimeChange,
    allItems: IContainerTemplateItem[]
  ): IContainerTemplateItem[] {
    const itemId = targetItem.id || targetItem.tmpId;
    const itemIndex = allItems.findIndex(
      (item) => (item.id || item.tmpId) === itemId
    );

    if (itemIndex === -1) {
      return allItems;
    }

    const oldItem = allItems[itemIndex];
    const needsPushDown = this.checkIfPushDownNeeded(oldItem, changes);

    const updatedItem: IContainerTemplateItem = { ...oldItem };

    if (changes.briefingTime !== undefined) {
      updatedItem.briefingTime = changes.briefingTime;
    }
    if (changes.debriefingTime !== undefined) {
      updatedItem.debriefingTime = changes.debriefingTime;
    }
    if (changes.travelTimeBefore !== undefined) {
      updatedItem.travelTimeBefore = changes.travelTimeBefore;
    }
    if (changes.travelTimeAfter !== undefined) {
      updatedItem.travelTimeAfter = changes.travelTimeAfter;
    }
    if (changes.transportMode !== undefined) {
      updatedItem.transportMode = changes.transportMode;
    }

    if (
      changes.timeRangeStartShift !== undefined &&
      oldItem.shift?.isTimeRange
    ) {
      updatedItem.timeRangeStartShift = changes.timeRangeStartShift;
      const workTimeMinutes = Math.round((oldItem.shift?.workTime || 0) * 60);
      const startMinutes = this.timeRangeService.getShiftStartMinutes({
        ...oldItem,
        timeRangeStartShift: changes.timeRangeStartShift,
      });
      updatedItem.timeRangeEndShift = this.minutesToTimeString(
        startMinutes + workTimeMinutes
      );
    }

    const result = [...allItems];
    result[itemIndex] = updatedItem;

    if (needsPushDown) {
      return this.pushDownOverlappingItems(updatedItem, result);
    }

    return result;
  }

  private checkIfPushDownNeeded(
    oldItem: IContainerTemplateItem,
    changes: ItemTimeChange
  ): boolean {
    if (changes.timeRangeStartShift !== undefined) {
      const oldStart = this.timeRangeService.getShiftStartMinutes(oldItem);
      const newStart = timeToMinutes(changes.timeRangeStartShift);
      if (newStart > oldStart) {
        return true;
      }
    }

    if (changes.briefingTime !== undefined) {
      const oldMinutes = timeToMinutes(oldItem.briefingTime);
      const newMinutes = timeToMinutes(changes.briefingTime);
      if (newMinutes > oldMinutes) {
        return true;
      }
    }

    if (changes.debriefingTime !== undefined) {
      const oldMinutes = timeToMinutes(oldItem.debriefingTime);
      const newMinutes = timeToMinutes(changes.debriefingTime);
      if (newMinutes > oldMinutes) {
        return true;
      }
    }

    if (changes.travelTimeBefore !== undefined) {
      const oldMinutes = timeToMinutes(oldItem.travelTimeBefore);
      const newMinutes = timeToMinutes(changes.travelTimeBefore);
      if (newMinutes > oldMinutes) {
        return true;
      }
    }

    if (changes.travelTimeAfter !== undefined) {
      const oldMinutes = timeToMinutes(oldItem.travelTimeAfter);
      const newMinutes = timeToMinutes(changes.travelTimeAfter);
      if (newMinutes > oldMinutes) {
        return true;
      }
    }

    return false;
  }

  pushDownOverlappingItems(
    changedItem: IContainerTemplateItem,
    allItems: IContainerTemplateItem[]
  ): IContainerTemplateItem[] {
    const result = [...allItems];
    const changedId = changedItem.id || changedItem.tmpId;
    const changedIndex = result.findIndex(
      (item) => (item.id || item.tmpId) === changedId
    );

    if (changedIndex === -1) {
      return result;
    }

    result[changedIndex] = changedItem;

    const changedEffectiveEnd =
      this.timeRangeService.getEffectiveEndMinutes(changedItem);

    for (let i = 0; i < result.length; i++) {
      if (i === changedIndex || !result[i].shift?.isTimeRange) continue;

      const currentItem = result[i];
      const currentEffectiveStart =
        this.timeRangeService.getEffectiveStartMinutes(currentItem);
      const currentStartMinutes =
        this.timeRangeService.getShiftStartMinutes(currentItem);

      const changedStartMinutes =
        this.timeRangeService.getShiftStartMinutes(changedItem);

      if (
        currentEffectiveStart < changedEffectiveEnd &&
        currentStartMinutes >= changedStartMinutes
      ) {
        const preShiftTime =
          this.timeRangeService.getTotalPreShiftMinutes(currentItem);
        const workTimeMinutes = Math.round(
          (currentItem.shift?.workTime || 0) * 60
        );

        const newStartMinutes = changedEffectiveEnd + preShiftTime;
        const newEndMinutes = newStartMinutes + workTimeMinutes;

        result[i] = {
          ...currentItem,
          timeRangeStartShift: this.minutesToTimeString(newStartMinutes),
          timeRangeEndShift: this.minutesToTimeString(newEndMinutes),
        };

        return this.pushDownOverlappingItems(result[i], result);
      }
    }

    return result;
  }

  applyOptimizedRoute(
    routeData: RouteOptimizationData,
    currentItems: IContainerTemplateItem[],
    containerStartTimeMinutes: number
  ): IContainerTemplateItem[] {
    const reorderedItems: IContainerTemplateItem[] = [];
    const itemsByShiftId = new Map<string, IContainerTemplateItem>();

    currentItems.forEach((item) => {
      if (item.shiftId) {
        itemsByShiftId.set(item.shiftId, item);
      }
    });

    let currentStartTimeMinutes = containerStartTimeMinutes;

    for (let i = 0; i < routeData.optimizedRoute.length; i++) {
      const routeStep = routeData.optimizedRoute[i];
      const item = itemsByShiftId.get(routeStep.shiftId);

      if (item && item.shift) {
        const itemTransportMode = item.transportMode ?? TransportModeEnum.byCar;
        let travelTimeToThisShiftMinutes = 0;
        if (i === 0) {
          travelTimeToThisShiftMinutes = this.parseTimeSpan(
            routeData.travelTimeFromStartBase,
            itemTransportMode
          );
        } else {
          travelTimeToThisShiftMinutes = this.parseTimeSpan(
            routeData.optimizedRoute[i - 1].travelTimeToNext,
            itemTransportMode
          );
        }

        const briefingTimeMinutes = timeToMinutes(item.briefingTime);
        const debriefingTimeMinutes = timeToMinutes(item.debriefingTime);
        const shiftWorkTimeMinutes = Math.round(item.shift.workTime * 60);

        const arrivalTimeMinutes =
          currentStartTimeMinutes + travelTimeToThisShiftMinutes;
        const shiftStartMinutes = arrivalTimeMinutes + briefingTimeMinutes;
        const newStartShift = formatTimeFromMinutes(shiftStartMinutes);
        const newEndShift = formatTimeFromMinutes(
          shiftStartMinutes + shiftWorkTimeMinutes
        );

        const travelTimeBeforeHHMM = this.formatMinutesToHHMM(
          travelTimeToThisShiftMinutes
        );

        const newItem: IContainerTemplateItem = {
          ...item,
          timeRangeStartShift: newStartShift,
          timeRangeEndShift: newEndShift,
          travelTimeBefore: travelTimeBeforeHHMM,
        };

        reorderedItems.push(newItem);
        currentStartTimeMinutes =
          shiftStartMinutes + shiftWorkTimeMinutes + debriefingTimeMinutes;
      }
    }

    if (
      routeData.distanceToEndBaseKm > 0 &&
      routeData.travelTimeToEndBase &&
      reorderedItems.length > 0
    ) {
      const lastItem = reorderedItems[reorderedItems.length - 1];
      const returnTransportMode =
        lastItem.transportMode ?? TransportModeEnum.byCar;
      const travelTimeToEndBaseMinutes = this.parseTimeSpan(
        routeData.travelTimeToEndBase,
        returnTransportMode
      );
      const travelTimeAfterHHMM = this.formatMinutesToHHMM(
        travelTimeToEndBaseMinutes
      );
      reorderedItems[reorderedItems.length - 1] = {
        ...lastItem,
        travelTimeAfter: travelTimeAfterHHMM,
      };
    }

    return reorderedItems;
  }

  updateItemTimeRangeStart(
    item: IContainerTemplateItem,
    newStartMinutes: number,
    allItems: IContainerTemplateItem[]
  ): IContainerTemplateItem[] {
    const workTimeMinutes = Math.round((item.shift?.workTime || 0) * 60);
    const newEndMinutes = newStartMinutes + workTimeMinutes;

    const updatedItem: IContainerTemplateItem = {
      ...item,
      timeRangeStartShift: this.minutesToTimeString(newStartMinutes),
      timeRangeEndShift: this.minutesToTimeString(newEndMinutes),
    };

    return this.pushDownOverlappingItems(updatedItem, allItems);
  }

  removeItem(
    itemToRemove: IContainerTemplateItem,
    allItems: IContainerTemplateItem[]
  ): IContainerTemplateItem[] {
    const itemId = itemToRemove.id || itemToRemove.tmpId;
    return allItems.filter((item) => (item.id || item.tmpId) !== itemId);
  }

  private minutesToTimeString(totalMinutes: number): string {
    const normalizedMinutes = totalMinutes % this.MINUTES_PER_DAY;
    const hours = Math.floor(normalizedMinutes / 60);
    const minutes = normalizedMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:00`;
  }

  private formatMinutesToHHMM(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}`;
  }

  private parseTimeSpan(
    timeSpan: string,
    transportMode?: TransportModeEnum
  ): number {
    const parts = timeSpan.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const seconds = parts.length >= 3 ? parseInt(parts[2], 10) : 0;
      const totalMinutes = hours * 60 + minutes + seconds / 60;

      if (totalMinutes > 0) {
        const minTime = this.getMinTravelTime(transportMode);
        return Math.max(minTime, Math.ceil(totalMinutes));
      }
      return 0;
    }
    return 0;
  }

  private getMinTravelTime(transportMode?: TransportModeEnum): number {
    switch (transportMode) {
      case TransportModeEnum.byCar:
        return this.MIN_TRAVEL_TIME_BY_CAR;
      case TransportModeEnum.byBicycle:
        return this.MIN_TRAVEL_TIME_BY_BICYCLE;
      case TransportModeEnum.byFoot:
        return this.MIN_TRAVEL_TIME_BY_FOOT;
      default:
        return this.MIN_TRAVEL_TIME_BY_CAR;
    }
  }
}
