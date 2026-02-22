// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable } from '@angular/core';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import {
  isOwnTimeStructOk,
  transformOwnTimeToNumber,
} from 'src/app/domain/helpers/own-time.helper';

@Injectable({
  providedIn: 'root',
})
export class WorkTimeCalculationService {
  calculateWorkTime(
    startShift: OwnTime | undefined,
    endShift: OwnTime | undefined
  ): number {
    if (
      !startShift ||
      !endShift ||
      !isOwnTimeStructOk(startShift) ||
      !isOwnTimeStructOk(endShift)
    ) {
      return 0;
    }

    const startMinutes = startShift.toMinutes();
    const endMinutes = endShift.toMinutes();

    let workTimeMinutes: number;

    if (startMinutes === endMinutes) {
      workTimeMinutes = 24 * 60;
    } else if (endMinutes > startMinutes) {
      workTimeMinutes = endMinutes - startMinutes;
    } else {
      workTimeMinutes = 24 * 60 - startMinutes + endMinutes;
    }

    return workTimeMinutes / 60;
  }

  calculateWorkTimeWithFallback(
    startShift: OwnTime | undefined,
    endShift: OwnTime | undefined,
    manualWorkTime?: OwnTime
  ): number {
    if (
      startShift &&
      endShift &&
      isOwnTimeStructOk(startShift) &&
      isOwnTimeStructOk(endShift)
    ) {
      return this.calculateWorkTime(startShift, endShift);
    }

    if (manualWorkTime && isOwnTimeStructOk(manualWorkTime)) {
      return transformOwnTimeToNumber(manualWorkTime);
    }

    return 0;
  }

  isValidTimeSpan(
    startShift: OwnTime | undefined,
    endShift: OwnTime | undefined
  ): boolean {
    if (
      !startShift ||
      !endShift ||
      !isOwnTimeStructOk(startShift) ||
      !isOwnTimeStructOk(endShift)
    ) {
      return false;
    }

    const startMinutes = startShift.toMinutes();
    const endMinutes = endShift.toMinutes();

    if (startMinutes === endMinutes) {
      return true;
    }

    return true;
  }

  formatWorkTimeForDisplay(workTimeHours: number): string {
    const hours = Math.floor(workTimeHours);
    const minutes = Math.round((workTimeHours - hours) * 60);

    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }
}
