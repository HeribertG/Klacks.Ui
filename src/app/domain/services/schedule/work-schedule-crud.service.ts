import { inject, Injectable, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IWorkScheduleFilter, WorkScheduleEntryType } from 'src/app/domain/models/work-schedule-class';
import { DataWorkScheduleService } from 'src/app/infrastructure/api/data-work-schedule.service';
import { addDays, formatDateOnly } from 'src/app/shared/helpers/date.helper';
import { ShiftScheduleLoaderService } from './shift-schedule-loader.service';
import { WorkScheduleLoaderService } from './work-schedule-loader.service';
import { WorkCrudService } from './work-crud.service';
import { AvailableShiftsCalculatorService } from './available-shifts-calculator.service';
import { IWorkFilter } from '../../models/schedule-class';
import { DataManagementBreakService } from '../break/data-management-break.service';

export interface ScheduleCellParams {
  clientId: string;
  date: Date;
  shiftId: string;
  workTime: number;
  startTime: string;
  endTime: string;
}

export interface DeleteWorkScheduleEntryParams {
  sourceId: string;
  clientId: string;
  date: Date;
  entryId: string;
  entryType: number;
}

@Injectable({
  providedIn: 'root',
})
export class WorkScheduleCrudService {
  private destroyRef = inject(DestroyRef);
  private dataWorkSchedule = inject(DataWorkScheduleService);
  private shiftLoader = inject(ShiftScheduleLoaderService);
  private workScheduleLoader = inject(WorkScheduleLoaderService);
  private workCrud = inject(WorkCrudService);
  private availableShiftsCalc = inject(AvailableShiftsCalculatorService);
  private breakService = inject(DataManagementBreakService);

  public scheduleRefreshed = signal<boolean>(false);
  public shiftScheduleRefreshed = signal<boolean>(false);

  addWorkScheduleEntry(params: ScheduleCellParams, workFilter: IWorkFilter): Promise<void> {
    this.updateShiftEngagedLocally(params.shiftId, params.date, 1, workFilter);

    const periodStart = this.workScheduleLoader.startDate
      ? formatDateOnly(this.workScheduleLoader.startDate)
      : formatDateOnly(new Date());
    const periodEnd = this.workScheduleLoader.endDate
      ? formatDateOnly(this.workScheduleLoader.endDate)
      : formatDateOnly(new Date());

    return this.workCrud.createWork({ ...params, periodStart, periodEnd }).then(async (response) => {
      if (response.periodHours) {
        this.workScheduleLoader.periodHours.set(params.clientId, response.periodHours);
      }
      await this.refreshClientScheduleForDays(params.clientId, params.date);
    });
  }

  async bulkAddWorkScheduleEntries(entries: ScheduleCellParams[], workFilter: IWorkFilter): Promise<void> {
    if (entries.length === 0) return;

    for (const entry of entries) {
      this.updateShiftEngagedLocally(entry.shiftId, entry.date, 1, workFilter);
    }

    const periodStart = this.workScheduleLoader.startDate
      ? formatDateOnly(this.workScheduleLoader.startDate)
      : formatDateOnly(new Date());
    const periodEnd = this.workScheduleLoader.endDate
      ? formatDateOnly(this.workScheduleLoader.endDate)
      : formatDateOnly(new Date());

    const response = await this.workCrud.bulkCreateWorks({
      entries: entries.map(e => ({
        clientId: e.clientId,
        shiftId: e.shiftId,
        date: e.date,
        workTime: e.workTime,
        startTime: e.startTime,
        endTime: e.endTime,
      })),
      periodStart,
      periodEnd,
    });

    if (response.periodHours) {
      for (const [clientId, hours] of Object.entries(response.periodHours)) {
        this.workScheduleLoader.periodHours.set(clientId, hours);
      }
    }

    const clientRanges = this.calculateBulkAddClientDateRanges(entries);

    const refreshPromises: Promise<void>[] = [];
    for (const [clientId, range] of clientRanges) {
      refreshPromises.push(this.refreshClientScheduleForDateRange(clientId, range.start, range.end));
    }

    await Promise.all(refreshPromises);

    this.workScheduleLoader.updateClientNeededRows();
  }

  private calculateBulkAddClientDateRanges(entries: ScheduleCellParams[]): Map<string, { start: Date; end: Date }> {
    const clientDates = new Map<string, { min: number; max: number }>();

    for (const entry of entries) {
      const timestamp = entry.date.getTime();
      const existing = clientDates.get(entry.clientId);

      if (existing) {
        existing.min = Math.min(existing.min, timestamp);
        existing.max = Math.max(existing.max, timestamp);
      } else {
        clientDates.set(entry.clientId, { min: timestamp, max: timestamp });
      }
    }

    const clientRanges = new Map<string, { start: Date; end: Date }>();

    for (const [clientId, range] of clientDates) {
      clientRanges.set(clientId, {
        start: addDays(new Date(range.min), -1),
        end: addDays(new Date(range.max), 1),
      });
    }

    return clientRanges;
  }

  deleteWorkScheduleEntry(params: DeleteWorkScheduleEntryParams, workFilter: IWorkFilter): void {
    const periodStart = this.workScheduleLoader.startDate
      ? formatDateOnly(this.workScheduleLoader.startDate)
      : formatDateOnly(new Date());
    const periodEnd = this.workScheduleLoader.endDate
      ? formatDateOnly(this.workScheduleLoader.endDate)
      : formatDateOnly(new Date());

    if (params.entryType === WorkScheduleEntryType.Break) {
      this.breakService.deleteBreak(params.sourceId, periodStart, periodEnd).subscribe({
        next: (response) => {
          if (response.periodHours) {
            this.workScheduleLoader.periodHours.set(params.clientId, response.periodHours);
          }
          this.refreshClientScheduleForDays(params.clientId, params.date);
        },
        error: (err) => console.error('Error deleting break:', err),
      });
    } else {
      this.workCrud.deleteWorkById(params.sourceId, periodStart, periodEnd).then((response) => {
        if (response.periodHours) {
          this.workScheduleLoader.periodHours.set(params.clientId, response.periodHours);
        }
        this.refreshClientScheduleForDays(params.clientId, params.date);
        this.updateShiftEngagedLocally(params.entryId, params.date, -1, workFilter);
      });
    }
  }

  bulkDeleteWorkScheduleEntries(entries: DeleteWorkScheduleEntryParams[], workFilter: IWorkFilter): void {
    if (entries.length === 0) return;

    const workEntries = entries.filter(e => e.entryType !== WorkScheduleEntryType.Break);
    const breakEntries = entries.filter(e => e.entryType === WorkScheduleEntryType.Break);

    const periodStart = this.workScheduleLoader.startDate
      ? formatDateOnly(this.workScheduleLoader.startDate)
      : formatDateOnly(new Date());
    const periodEnd = this.workScheduleLoader.endDate
      ? formatDateOnly(this.workScheduleLoader.endDate)
      : formatDateOnly(new Date());

    const deletePromises: Promise<void>[] = [];

    if (workEntries.length > 0) {
      const workIds = workEntries.map(e => e.sourceId);
      deletePromises.push(
        this.workCrud.bulkDeleteWorks(workIds).then((response) => {
          if (response.periodHours) {
            for (const [clientId, hours] of Object.entries(response.periodHours)) {
              this.workScheduleLoader.periodHours.set(clientId, hours);
            }
          }
        })
      );
    }

    for (const breakEntry of breakEntries) {
      deletePromises.push(
        new Promise<void>((resolve, reject) => {
          this.breakService.deleteBreak(breakEntry.sourceId, periodStart, periodEnd).subscribe({
            next: (response) => {
              if (response.periodHours) {
                this.workScheduleLoader.periodHours.set(breakEntry.clientId, response.periodHours);
              }
              resolve();
            },
            error: (err) => {
              console.error('Error deleting break:', err);
              reject(err);
            },
          });
        })
      );
    }

    Promise.all(deletePromises).then(async () => {
      const clientShiftDates = new Map<string, Set<number>>();
      for (const entry of entries) {
        const key = `${entry.clientId}|${entry.entryId}`;
        if (!clientShiftDates.has(key)) {
          clientShiftDates.set(key, new Set());
        }
        clientShiftDates.get(key)!.add(entry.date.getTime());
      }

      const clientRanges = new Map<string, { start: Date; end: Date }[]>();
      for (const [key, dates] of clientShiftDates) {
        const clientId = key.split('|')[0];
        const sortedDates = Array.from(dates).sort((a, b) => a - b);
        const ranges = this.mergeOverlappingDateRanges(sortedDates);

        if (!clientRanges.has(clientId)) {
          clientRanges.set(clientId, []);
        }
        clientRanges.get(clientId)!.push(...ranges);
      }

      const refreshPromises: Promise<void>[] = [];
      for (const [clientId, ranges] of clientRanges) {
        const mergedRanges = this.mergeClientDateRanges(ranges);
        for (const range of mergedRanges) {
          refreshPromises.push(this.refreshClientScheduleForDateRange(clientId, range.start, range.end));
        }
      }

      await Promise.all(refreshPromises);

      this.bulkUpdateShiftEngagedLocally(entries, workFilter);

      this.workScheduleLoader.updateClientNeededRows();
    });
  }

  public refreshClientScheduleForDays(clientId: string, centerDate: Date): Promise<void> {
    const startDate = addDays(centerDate, -1);
    const endDate = addDays(centerDate, 1);
    return this.refreshClientScheduleForDateRange(clientId, startDate, endDate);
  }

  private refreshClientScheduleForDateRange(clientId: string, startDate: Date, endDate: Date): Promise<void> {
    const filter: IWorkScheduleFilter = {
      startDate: formatDateOnly(startDate),
      endDate: formatDateOnly(endDate),
    };

    return new Promise<void>((resolve, reject) => {
      this.dataWorkSchedule.getWorkSchedule(filter)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => {
            const clientEntries = response.entries.filter(e => e.clientId === clientId);
            this.workScheduleLoader.replaceClientEntriesForDays(clientId, startDate, endDate, clientEntries);

            this.triggerScheduleRefresh();
            resolve();
          },
          error: (err) => {
            console.error('Error refreshing schedule:', err);
            reject(err);
          },
        });
    });
  }

  private updateShiftEngagedLocally(shiftId: string, date: Date, delta: number, workFilter: IWorkFilter): void {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    for (const shift of this.shiftLoader.shiftSchedules) {
      if (shift.shiftId !== shiftId) continue;

      const shiftDate = new Date(shift.date);
      shiftDate.setHours(0, 0, 0, 0);

      if (shiftDate.getTime() === normalizedDate.getTime()) {
        shift.engaged = Math.max(0, shift.engaged + delta);
      }
    }

    this.recalculateAndTriggerShiftRefresh(workFilter);
  }

  private bulkUpdateShiftEngagedLocally(entries: { entryId: string; date: Date }[], workFilter: IWorkFilter): void {
    for (const entry of entries) {
      const normalizedDate = new Date(entry.date);
      normalizedDate.setHours(0, 0, 0, 0);

      for (const shift of this.shiftLoader.shiftSchedules) {
        if (shift.shiftId !== entry.entryId) continue;

        const shiftDate = new Date(shift.date);
        shiftDate.setHours(0, 0, 0, 0);

        if (shiftDate.getTime() === normalizedDate.getTime()) {
          shift.engaged = Math.max(0, shift.engaged - 1);
        }
      }
    }

    this.recalculateAndTriggerShiftRefresh(workFilter);
  }

  private recalculateAndTriggerShiftRefresh(workFilter: IWorkFilter): void {
    this.availableShiftsCalc.calculate(this.shiftLoader.shiftSchedules, workFilter);
    this.triggerShiftScheduleRefresh();
  }

  private triggerScheduleRefresh(): void {
    this.scheduleRefreshed.set(true);
    setTimeout(() => this.scheduleRefreshed.set(false), 100);
  }

  private triggerShiftScheduleRefresh(): void {
    this.shiftScheduleRefreshed.set(true);
    setTimeout(() => this.shiftScheduleRefreshed.set(false), 100);
  }

  private mergeOverlappingDateRanges(sortedTimestamps: number[]): { start: Date; end: Date }[] {
    if (sortedTimestamps.length === 0) return [];

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const ranges: { start: Date; end: Date }[] = [];

    let currentStart = new Date(sortedTimestamps[0] - ONE_DAY_MS);
    let currentEnd = new Date(sortedTimestamps[0] + ONE_DAY_MS);

    for (let i = 1; i < sortedTimestamps.length; i++) {
      const nextStart = new Date(sortedTimestamps[i] - ONE_DAY_MS);
      const nextEnd = new Date(sortedTimestamps[i] + ONE_DAY_MS);

      if (nextStart.getTime() <= currentEnd.getTime() + ONE_DAY_MS) {
        currentEnd = nextEnd;
      } else {
        ranges.push({ start: currentStart, end: currentEnd });
        currentStart = nextStart;
        currentEnd = nextEnd;
      }
    }

    ranges.push({ start: currentStart, end: currentEnd });

    return ranges;
  }

  private mergeClientDateRanges(ranges: { start: Date; end: Date }[]): { start: Date; end: Date }[] {
    if (ranges.length <= 1) return ranges;

    const sorted = [...ranges].sort((a, b) => a.start.getTime() - b.start.getTime());
    const merged: { start: Date; end: Date }[] = [];

    let current = { ...sorted[0] };

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].start.getTime() <= current.end.getTime()) {
        current.end = new Date(Math.max(current.end.getTime(), sorted[i].end.getTime()));
      } else {
        merged.push(current);
        current = { ...sorted[i] };
      }
    }

    merged.push(current);
    return merged;
  }
}
