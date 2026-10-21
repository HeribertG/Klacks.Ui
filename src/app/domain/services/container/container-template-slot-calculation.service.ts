// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Injectable } from '@angular/core';
import { IShift } from '../../models/shift/shift.interface';
import { IContainerTemplateSlot } from '../../models/container/container-template-slot';
import { IContainerTemplateGrid } from '../../models/container/container-template-grid.interface';
import { IContainerTemplateHolidayVariant } from '../../models/container/container-template-holiday-variant';
import { FT_HOLIDAY_TEMPLATE_WEEKDAY } from '../../constants/container-template-holiday.constants';

const DAYS_IN_WEEK = 7;

enum WeekdayName {
  Sunday = 0,
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6
}

const WEEKDAY_NAMES: Record<number, string> = {
  [WeekdayName.Sunday]: 'Sunday',
  [WeekdayName.Monday]: 'Monday',
  [WeekdayName.Tuesday]: 'Tuesday',
  [WeekdayName.Wednesday]: 'Wednesday',
  [WeekdayName.Thursday]: 'Thursday',
  [WeekdayName.Friday]: 'Friday',
  [WeekdayName.Saturday]: 'Saturday'
};

const HOLIDAY_LABELS = {
  NORMAL: 'Normal',
  WEEKDAY: 'Weekday',
  HOLIDAY: 'Holiday',
  HOLIDAY_ONLY: 'Holiday Only'
} as const;

@Injectable({
  providedIn: 'root'
})
export class ContainerTemplateSlotCalculationService {

  calculateTemplateGrid(containerShift: IShift): IContainerTemplateGrid {
    const activeWeekdays = this.getActiveWeekdays(containerShift);
    const crossesMidnight = this.checkIfCrossesMidnight(containerShift);
    const weekdayVariants = this.getWeekdayVariants(containerShift);

    const slots: IContainerTemplateSlot[][] = [];

    for (const weekday of activeWeekdays) {
      for (const variant of weekdayVariants) {
        this.pushSlots(slots, containerShift, weekday, variant, crossesMidnight);
      }
    }

    if (this.isEveryHolidayContainer(containerShift)) {
      this.pushSlots(
        slots,
        containerShift,
        FT_HOLIDAY_TEMPLATE_WEEKDAY,
        { isHoliday: true, isWeekdayAndHoliday: false },
        crossesMidnight
      );
    }

    return {
      containerShift,
      slots,
      crossesMidnight,
      totalRows: slots.length,
      totalDays: crossesMidnight ? 2 : 1
    };
  }

  private pushSlots(
    slots: IContainerTemplateSlot[][],
    containerShift: IShift,
    weekday: number,
    variant: IContainerTemplateHolidayVariant,
    crossesMidnight: boolean
  ): void {
    const dayIndexes = crossesMidnight ? [0, 1] : [0];
    for (const dayIndex of dayIndexes) {
      slots.push([
        this.createSlot(
          containerShift,
          weekday,
          variant.isHoliday,
          variant.isWeekdayAndHoliday,
          dayIndex,
          crossesMidnight
        )
      ]);
    }
  }

  private getActiveWeekdays(shift: IShift): number[] {
    const weekdays: number[] = [];
    if (shift.isSunday) weekdays.push(0);
    if (shift.isMonday) weekdays.push(1);
    if (shift.isTuesday) weekdays.push(2);
    if (shift.isWednesday) weekdays.push(3);
    if (shift.isThursday) weekdays.push(4);
    if (shift.isFriday) weekdays.push(5);
    if (shift.isSaturday) weekdays.push(6);
    return weekdays;
  }

  private getWeekdayVariants(shift: IShift): IContainerTemplateHolidayVariant[] {
    const variants: IContainerTemplateHolidayVariant[] = [{ isHoliday: false, isWeekdayAndHoliday: false }];
    if (shift.isWeekdayAndHoliday) {
      variants.push({ isHoliday: true, isWeekdayAndHoliday: true });
    }
    return variants;
  }

  private isEveryHolidayContainer(shift: IShift): boolean {
    return shift.isHoliday && !shift.isWeekdayAndHoliday;
  }

  private checkIfCrossesMidnight(shift: IShift): boolean {
    if (shift.cuttingAfterMidnight) {
      return true;
    }

    const startTime = shift.startShift;
    const endTime = shift.endShift;

    if (!startTime || !endTime) {
      return false;
    }

    return endTime < startTime;
  }

  private createSlot(
    containerShift: IShift,
    weekday: number,
    isHoliday: boolean,
    isWeekdayAndHoliday: boolean,
    dayIndex: number,
    crossesMidnight: boolean
  ): IContainerTemplateSlot {
    const effectiveWeekday = dayIndex === 0
      ? weekday
      : (weekday + 1) % DAYS_IN_WEEK;
    const weekdayName = WEEKDAY_NAMES[weekday];
    const effectiveWeekdayName = WEEKDAY_NAMES[effectiveWeekday];
    const holidayLabel = this.getHolidayLabel(isHoliday, isWeekdayAndHoliday);

    const { fromTime, untilTime } = this.calculateTimeWindow(
      containerShift.startShift,
      containerShift.endShift,
      dayIndex,
      crossesMidnight
    );

    const label = crossesMidnight
      ? `${effectiveWeekdayName} (${holidayLabel})`
      : `${weekdayName} (${holidayLabel})`;

    return {
      weekday,
      weekdayName,
      effectiveWeekday,
      isHoliday,
      isWeekdayAndHoliday,
      dayIndex,
      label,
      fromTime,
      untilTime
    };
  }

  private getHolidayLabel(isHoliday: boolean, isWeekdayAndHoliday: boolean): string {
    if (isHoliday && isWeekdayAndHoliday) {
      return HOLIDAY_LABELS.HOLIDAY;
    }
    if (isWeekdayAndHoliday) {
      return HOLIDAY_LABELS.WEEKDAY;
    }
    if (isHoliday) {
      return HOLIDAY_LABELS.HOLIDAY_ONLY;
    }
    return HOLIDAY_LABELS.NORMAL;
  }

  private calculateTimeWindow(
    startShift: string,
    endShift: string,
    dayIndex: number,
    crossesMidnight: boolean
  ): { fromTime: string; untilTime: string } {
    if (!crossesMidnight) {
      return {
        fromTime: startShift,
        untilTime: endShift
      };
    }

    if (dayIndex === 0) {
      return {
        fromTime: startShift,
        untilTime: '23:59:59'
      };
    } else {
      return {
        fromTime: '00:00:00',
        untilTime: endShift
      };
    }
  }

  getWeekdayName(weekday: number): string {
    return WEEKDAY_NAMES[weekday] || '';
  }
}
