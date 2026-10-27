// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pure paste rules of the schedule grid: turns copied schedule cells or pasted text into the work and break
 * entries to bulk-create. Which target cells may receive an entry (sealed day, membership and group period,
 * already filled cell, row without client) is decided by the caller's resolveTarget.
 *
 * Availability check differences: Work/Shift requires an availability check (quantity * sumEmployees limit),
 * the shift must have remaining capacity before a work entry can be created. Break/Absence needs no availability
 * check and can be created without any capacity restriction. External text (Excel, plain text) only supports
 * Work/Shift entries by abbreviation; Break/Absence paste works through the internal copy only.
 * @param copiedCells - Snapshot of the copied block, rows of cells (undefined for empty cells)
 * @param data - Pasted text cells, rows of shift abbreviations
 * @param startRow - Grid row of the top-left paste target
 * @param startCol - Grid column of the top-left paste target
 * @param shiftSchedules - All loaded shift-date assignments
 * @param resolveTarget - Client and date of a target cell, or undefined when the cell must be skipped
 */
import { isSameCalendarDate } from 'src/app/domain/helpers/calendar-date.helper';
import { timeToMinutes } from 'src/app/domain/helpers/time-format.helper';
import { IScheduleCell } from 'src/app/domain/models/schedule/schedule-cell.interface';
import { IShiftSchedule } from 'src/app/domain/models/schedule/shift-schedule.interface';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-entry-type.enum';
import { BreakCellParams } from 'src/app/domain/services/schedule/break-cell-params.interface';
import { breakWorkTimeToCarry } from 'src/app/domain/helpers/break-duration.helper';
import { ScheduleCellParams } from 'src/app/domain/services/schedule/schedule-cell-params.interface';
import { defaultTimeRangePlacement, resolveTimeRangePlacement } from 'src/app/shared/helpers/time-range-placement.helper';
import { ISchedulePasteEntries } from './schedule-paste-entries.interface';
import { ISchedulePasteTarget } from './schedule-paste-target.interface';

const NO_BREAK_TIME = '00:00';

export function collectCopiedCellsPaste(
  copiedCells: (IScheduleCell | undefined)[][],
  startRow: number,
  startCol: number,
  shiftSchedules: IShiftSchedule[],
  resolveTarget: (row: number, col: number) => ISchedulePasteTarget | undefined,
): ISchedulePasteEntries {
  const workEntries: ScheduleCellParams[] = [];
  const breakEntries: BreakCellParams[] = [];

  for (let rowOffset = 0; rowOffset < copiedCells.length; rowOffset++) {
    const rowData = copiedCells[rowOffset];
    for (let colOffset = 0; colOffset < rowData.length; colOffset++) {
      const copiedEntry = rowData[colOffset];
      if (!copiedEntry) continue;

      const target = resolveTarget(startRow + rowOffset, startCol + colOffset);
      if (!target) continue;

      if (copiedEntry.entryType === WorkScheduleEntryType.Break) {
        breakEntries.push({
          clientId: target.clientId,
          absenceId: copiedEntry.entryId,
          date: target.date,
          workTime: breakWorkTimeToCarry(copiedEntry.startTime, copiedEntry.endTime, copiedEntry.changeTime),
          startTime: copiedEntry.startTime || NO_BREAK_TIME,
          endTime: copiedEntry.endTime || NO_BREAK_TIME,
        });
      } else {
        const matchingShift = findShiftByIdAndDate(shiftSchedules, copiedEntry.entryId, target.date);
        if (matchingShift) {
          workEntries.push({
            clientId: target.clientId,
            date: target.date,
            shiftId: matchingShift.shiftId,
            ...bulkWorkTimes(matchingShift, copiedEntry),
          });
        }
      }
    }
  }

  return { workEntries, breakEntries };
}

export function collectTextPaste(
  data: string[][],
  startRow: number,
  startCol: number,
  shiftSchedules: IShiftSchedule[],
  resolveTarget: (row: number, col: number) => ISchedulePasteTarget | undefined,
): ScheduleCellParams[] {
  const workEntries: ScheduleCellParams[] = [];

  for (let rowOffset = 0; rowOffset < data.length; rowOffset++) {
    const rowData = data[rowOffset];
    for (let colOffset = 0; colOffset < rowData.length; colOffset++) {
      const abbreviation = rowData[colOffset].trim();
      if (!abbreviation) continue;

      const target = resolveTarget(startRow + rowOffset, startCol + colOffset);
      if (!target) continue;

      const matchingShift = findShiftByAbbreviationAndDate(shiftSchedules, abbreviation, target.date);
      if (matchingShift) {
        workEntries.push({
          clientId: target.clientId,
          date: target.date,
          shiftId: matchingShift.shiftId,
          ...bulkWorkTimes(matchingShift),
        });
      }
    }
  }

  return workEntries;
}

function findShiftByAbbreviationAndDate(
  shiftSchedules: IShiftSchedule[],
  abbreviation: string,
  date: Date,
): IShiftSchedule | undefined {
  const upperAbbr = abbreviation.toUpperCase();
  return shiftSchedules.find(
    (shift) =>
      shift.abbreviation.toUpperCase() === upperAbbr &&
      isSameCalendarDate(shift.date, date),
  );
}

function findShiftByIdAndDate(
  shiftSchedules: IShiftSchedule[],
  shiftId: string,
  date: Date,
): IShiftSchedule | undefined {
  return shiftSchedules.find(
    (shift) => shift.shiftId === shiftId && isSameCalendarDate(shift.date, date),
  );
}

/**
 * Times for a pasted shift. A fixed shift books its own times. A TimeRange shift never books its window:
 * a copied work keeps the span it was given, anything else gets the engagement duration at the window
 * start - a bulk paste cannot ask per cell.
 * @param shift - The shift schedule row for the target day
 * @param copiedEntry - The copied cell, when the paste comes from inside the schedule
 */
function bulkWorkTimes(
  shift: IShiftSchedule,
  copiedEntry?: IScheduleCell,
): { workTime: number; startTime: string; endTime: string } {
  if (!shift.isTimeRange) {
    return { workTime: shift.workTime, startTime: shift.startShift, endTime: shift.endShift };
  }

  if (copiedEntry?.startTime && copiedEntry.endTime) {
    const copiedPlacement = resolveTimeRangePlacement(
      shift.startShift,
      shift.endShift,
      timeToMinutes(copiedEntry.startTime),
      timeToMinutes(copiedEntry.endTime),
    );
    if (copiedPlacement) {
      return {
        workTime: copiedPlacement.workTime,
        startTime: copiedPlacement.startTime,
        endTime: copiedPlacement.endTime,
      };
    }
  }

  const { workTime, startTime, endTime } = defaultTimeRangePlacement(
    shift.startShift,
    shift.endShift,
    shift.workTime,
  );
  return { workTime, startTime, endTime };
}
