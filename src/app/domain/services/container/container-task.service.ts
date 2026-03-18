// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service fuer Task/Shift-Hilfsfunktionen in Container-Templates: Sortierung, Filterung, Weekday-Mapping.
 * @param WEEKDAY_DEFINITIONS - Statische Zuordnung von IShift-Flags zu Wochentag-Werten und Label-Keys
 * @param WEEKDAY_NAME_TO_NUMBER - Mapping von Wochentag-Namen (z.B. 'monday') zu numerischen Werten (0-6)
 * @param WEEKDAY_NUMBER_TO_NAME - Mapping von numerischen Wochentag-Werten (0-6) zu Namen
 */
import { Injectable } from '@angular/core';
import { IShift } from '../../models/shift/shift-class';
import {
  IContainerTemplateGrid,
  IContainerTemplateSlot,
} from '../../models/container/container-template-slot';
import { IWeekdayContainerTemplateItemsMap } from './container-template-shift.service';

@Injectable({
  providedIn: 'root',
})
export class ContainerTaskService {
  private static readonly WEEKDAY_DEFINITIONS: ReadonlyArray<{
    flag: keyof IShift;
    value: string;
    labelKey: string;
  }> = [
    { flag: 'isSunday', value: 'sunday', labelKey: 'shift.container-template.weekday.sunday' },
    { flag: 'isMonday', value: 'monday', labelKey: 'shift.container-template.weekday.monday' },
    { flag: 'isTuesday', value: 'tuesday', labelKey: 'shift.container-template.weekday.tuesday' },
    { flag: 'isWednesday', value: 'wednesday', labelKey: 'shift.container-template.weekday.wednesday' },
    { flag: 'isThursday', value: 'thursday', labelKey: 'shift.container-template.weekday.thursday' },
    { flag: 'isFriday', value: 'friday', labelKey: 'shift.container-template.weekday.friday' },
    { flag: 'isSaturday', value: 'saturday', labelKey: 'shift.container-template.weekday.saturday' },
  ];

  static readonly WEEKDAY_NAME_TO_NUMBER: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  static readonly WEEKDAY_NUMBER_TO_NAME: Record<number, keyof IWeekdayContainerTemplateItemsMap> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  };

  getActiveWeekdays(shift: IShift): { value: string; labelKey: string }[] {
    return ContainerTaskService.WEEKDAY_DEFINITIONS
      .filter((def) => shift[def.flag])
      .map(({ value, labelKey }) => ({ value, labelKey }));
  }

  getWeekdayNumber(weekdayValue: string): number {
    return ContainerTaskService.WEEKDAY_NAME_TO_NUMBER[weekdayValue] ?? -1;
  }

  getFilteredRowsForWeekday(
    grid: IContainerTemplateGrid | null,
    weekdayNumber: number
  ): IContainerTemplateSlot[][] {
    if (!grid) {
      return [];
    }

    return grid.slots.filter((row) => row[0].weekday === weekdayNumber);
  }

  getUniqueShifts(shifts: IShift[]): IShift[] {
    return shifts.filter(
      (shift, index, self) => index === self.findIndex((s) => s.id === shift.id)
    );
  }

  sortShifts(
    shifts: IShift[],
    orderBy: string,
    sortOrder: 'asc' | 'desc' | ''
  ): IShift[] {
    if (!orderBy || !sortOrder) {
      return shifts;
    }

    return [...shifts].sort((a, b) => {
      let valueA: string;
      let valueB: string;

      switch (orderBy) {
        case 'name':
          valueA = a.name?.toLowerCase() || '';
          valueB = b.name?.toLowerCase() || '';
          break;
        case 'abbreviation':
          valueA = a.abbreviation?.toLowerCase() || '';
          valueB = b.abbreviation?.toLowerCase() || '';
          break;
        case 'startShift':
          valueA = a.startShift || '';
          valueB = b.startShift || '';
          break;
        case 'client':
          valueA = a.client?.name?.toLowerCase() || '';
          valueB = b.client?.name?.toLowerCase() || '';
          break;
        default:
          return 0;
      }

      if (valueA < valueB) {
        return sortOrder === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  filterAvailableTasksBySearch(
    shifts: IShift[],
    searchString: string,
    includeAddress = false
  ): IShift[] {
    if (!searchString || searchString.trim() === '') {
      return shifts;
    }

    const search = searchString.toLowerCase().trim();

    return shifts.filter((shift) => {
      const name = shift.name?.toLowerCase() || '';
      const abbreviation = shift.abbreviation?.toLowerCase() || '';
      const clientName = shift.client?.name?.toLowerCase() || '';

      const matchesBasicSearch =
        name.includes(search) ||
        abbreviation.includes(search) ||
        clientName.includes(search);

      if (matchesBasicSearch) {
        return true;
      }

      if (includeAddress && shift.client?.addresses) {
        for (const address of shift.client.addresses) {
          const street = address.street?.toLowerCase() || '';
          const zip = address.zip?.toLowerCase() || '';
          const city = address.city?.toLowerCase() || '';

          if (
            street.includes(search) ||
            zip.includes(search) ||
            city.includes(search)
          ) {
            return true;
          }
        }
      }

      return false;
    });
  }
}
