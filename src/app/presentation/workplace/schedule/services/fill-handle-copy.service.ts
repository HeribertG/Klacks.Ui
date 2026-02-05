import { Injectable } from '@angular/core';
import type { IScheduleCell } from 'src/app/domain/models/work-schedule-class';
import { IShiftSchedule } from 'src/app/domain/models/shift-schedule-class';


export interface FillHandleDropResult {
  startColumn: number;
  endColumn: number;
  row: number;
  entryId: string;
  workTime: number;
  entryType: number;
}

export interface ColumnContext {
  column: number;
  date: Date | undefined;
  isLocked: boolean;
  isCellActive: boolean;
  clientId: string | undefined;
}

export interface WorkCopyEntry {
  clientId: string;
  date: Date;
  shiftId: string;
  workTime: number;
  startTime: string;
  endTime: string;
  information?: string;
}

export interface BreakCopyEntry {
  clientId: string;
  absenceId: string;
  date: Date;
  workTime: number;
  startTime: string;
  endTime: string;
  description?: string;
}

@Injectable({
  providedIn: 'root',
})
export class FillHandleCopyService {

  buildWorkEntriesToCopy(
    result: FillHandleDropResult,
    sourceEntry: IScheduleCell | undefined,
    columnContexts: ColumnContext[],
    shiftSchedules: IShiftSchedule[]
  ): WorkCopyEntry[] {
    const entriesToAdd: WorkCopyEntry[] = [];

    for (const ctx of columnContexts) {
      if (ctx.isLocked) {
        continue;
      }

      if (ctx.isCellActive) {
        continue;
      }

      if (!ctx.date) {
        continue;
      }

      const shiftAvailable = shiftSchedules.find(
        (s) => s.shiftId === result.entryId && this.isSameDay(s.date, ctx.date!)
      );

      if (!shiftAvailable) {
        continue;
      }

      const maxCapacity = shiftAvailable.sumEmployees * shiftAvailable.quantity;
      if (shiftAvailable.engaged >= maxCapacity) {
        continue;
      }

      if (!ctx.clientId) {
        continue;
      }

      entriesToAdd.push({
        clientId: ctx.clientId,
        date: ctx.date,
        shiftId: result.entryId,
        workTime: result.workTime,
        startTime: sourceEntry?.startTime || shiftAvailable.startShift,
        endTime: sourceEntry?.endTime || shiftAvailable.endShift,
        information: sourceEntry?.information ?? undefined,
      });
    }

    return entriesToAdd;
  }

  buildBreakEntriesToCopy(
    result: FillHandleDropResult,
    sourceEntry: IScheduleCell | undefined,
    columnContexts: ColumnContext[]
  ): BreakCopyEntry[] {
    if (!sourceEntry) {
      return [];
    }

    const entriesToAdd: BreakCopyEntry[] = [];

    for (const ctx of columnContexts) {
      if (ctx.isLocked) {
        continue;
      }

      if (ctx.isCellActive) {
        continue;
      }

      if (!ctx.date) {
        continue;
      }

      if (!ctx.clientId) {
        continue;
      }

      entriesToAdd.push({
        clientId: ctx.clientId,
        absenceId: result.entryId,
        date: ctx.date,
        workTime: 0,
        startTime: sourceEntry.startTime || '00:00',
        endTime: sourceEntry.endTime || '00:00',
        description: this.getDescriptionValue(sourceEntry.description),
      });
    }

    return entriesToAdd;
  }

  private getDescriptionValue(description: { de?: string; en?: string; fr?: string; it?: string } | null): string | undefined {
    if (!description) return undefined;
    return description.de || description.en || undefined;
  }

  private isSameDay(date1: Date | string, date2: Date | string): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }
}
