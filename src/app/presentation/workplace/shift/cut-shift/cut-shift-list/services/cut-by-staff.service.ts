// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for the cut-by-staff and cut-by-task strategies: analysis of employee and task counts.
 * @param shift - The shift to analyse with sumEmployees/quantity
 */
import { Injectable } from '@angular/core';
import { Shift } from 'src/app/domain/models/shift/shift-class';
import { CutStaffParams, CutTaskParams } from './cut-parameter-state';

@Injectable({
  providedIn: 'root',
})
export class CutByStaffService {
  analyzeCutByStaff(shift: Shift): CutStaffParams {
    const result: CutStaffParams = {
      staffCount: 1,
      minStaffCount: 1,
      maxStaffCount: 100,
    };

    if (shift.sumEmployees && shift.sumEmployees > 1) {
      result.minStaffCount = 1;
      result.maxStaffCount = shift.sumEmployees - 1;
      result.staffCount = 1;
    }

    return result;
  }

  analyzeCutByTask(shift: Shift): CutTaskParams {
    const result: CutTaskParams = {
      taskCount: 1,
      minTaskCount: 1,
      maxTaskCount: 50,
    };

    if (shift.quantity && shift.quantity > 1) {
      result.minTaskCount = 1;
      result.maxTaskCount = shift.quantity - 1;
      result.taskCount = 1;
    }

    return result;
  }

  isStaffCutEnabled(shift: Shift): boolean {
    return !!(shift.sumEmployees && shift.sumEmployees > 1);
  }

  isTaskCutEnabled(shift: Shift): boolean {
    return !!(shift.quantity && shift.quantity > 1);
  }
}
