import { Injectable } from '@angular/core';
import { IShift } from '../../models/shift-class';
import { IContainerTemplateSlot, IContainerTemplateGrid } from '../../models/container-template-slot';

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
    const holidayVariants = this.getHolidayVariants(containerShift);

    const totalDays = crossesMidnight ? 2 : 1;
    const slots: IContainerTemplateSlot[][] = [];

    for (const weekday of activeWeekdays) {
      for (const holidayVariant of holidayVariants) {
        const row: IContainerTemplateSlot[] = [];

        for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
          row.push(this.createSlot(
            containerShift,
            weekday,
            holidayVariant.isHoliday,
            holidayVariant.isWeekdayAndHoliday,
            dayIndex,
            crossesMidnight
          ));
        }

        slots.push(row);
      }
    }

    return {
      containerShift,
      slots,
      crossesMidnight,
      totalRows: slots.length,
      totalDays
    };
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

  private getHolidayVariants(shift: IShift): {isHoliday: boolean, isWeekdayAndHoliday: boolean, label: string}[] {
    const variants: {isHoliday: boolean, isWeekdayAndHoliday: boolean, label: string}[] = [];

    if (!shift.isHoliday && !shift.isWeekdayAndHoliday) {
      variants.push({ isHoliday: false, isWeekdayAndHoliday: false, label: HOLIDAY_LABELS.NORMAL });
    }

    if (shift.isWeekdayAndHoliday) {
      variants.push({ isHoliday: false, isWeekdayAndHoliday: false, label: HOLIDAY_LABELS.WEEKDAY });
      variants.push({ isHoliday: true, isWeekdayAndHoliday: true, label: HOLIDAY_LABELS.HOLIDAY });
    }

    if (shift.isHoliday && !shift.isWeekdayAndHoliday) {
      variants.push({ isHoliday: true, isWeekdayAndHoliday: false, label: HOLIDAY_LABELS.HOLIDAY });
    }

    return variants;
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
    const weekdayName = WEEKDAY_NAMES[weekday];
    const holidayLabel = this.getHolidayLabel(isHoliday, isWeekdayAndHoliday);
    const dayLabel = crossesMidnight ? ` - Day ${dayIndex + 1}` : '';

    const { fromTime, untilTime } = this.calculateTimeWindow(
      containerShift.startShift,
      containerShift.endShift,
      dayIndex,
      crossesMidnight
    );

    return {
      weekday,
      weekdayName,
      isHoliday,
      isWeekdayAndHoliday,
      dayIndex,
      label: `${weekdayName} (${holidayLabel})${dayLabel}`,
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
