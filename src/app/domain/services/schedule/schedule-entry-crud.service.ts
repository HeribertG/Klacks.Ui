// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, Injector, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IWorkScheduleFilter, WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';
import { DataWorkScheduleService } from 'src/app/infrastructure/api/schedule/data-work-schedule.service';
import { DataManagementWorkchangeService } from 'src/app/domain/services/workchange/data-management-workchange.service';
import { addDays, formatDateOnly } from 'src/app/shared/helpers/date.helper';
import { ShiftScheduleLoaderService } from './shift-schedule-loader.service';
import { WorkScheduleLoaderService } from './work-schedule-loader.service';
import { DataManagementWorkService } from '../work/data-management-work.service';
import { AvailableShiftsCalculatorService } from './available-shifts-calculator.service';
import { IWorkFilter } from '../../models/schedule/schedule-class';
import { DataManagementBreakService } from '../break/data-management-break.service';
import { DataManagementExpensesService } from '../expenses/data-management-expenses.service';
import { Break } from '../../models/break/break-class';
import { AppSettingsManagementService } from '../settings/app-settings-management.service';
import { GroupSelectionService } from '../group/group-selection.service';
export interface ScheduleCellParams {
  clientId: string;
  date: Date;
  shiftId: string;
  workTime: number;
  startTime: string;
  endTime: string;
  information?: string;
}

export interface BreakCellParams {
  clientId: string;
  absenceId: string;
  date: Date;
  workTime: number;
  startTime: string;
  endTime: string;
  information?: string;
  description?: { de?: string; en?: string; fr?: string; it?: string };
}

export interface DeleteWorkScheduleEntryParams {
  id: string;
  sourceId: string;
  clientId: string;
  date: Date;
  entryId: string;
  entryType: number;
}

@Injectable({
  providedIn: 'root',
})
export class ScheduleEntryCrudService {
  private destroyRef = inject(DestroyRef);
  private dataWorkSchedule = inject(DataWorkScheduleService);
  private dataWorkChangeService = inject(DataManagementWorkchangeService);
  private shiftLoader = inject(ShiftScheduleLoaderService);
  private workScheduleLoader = inject(WorkScheduleLoaderService);
  private workCrud = inject(DataManagementWorkService);
  private availableShiftsCalc = inject(AvailableShiftsCalculatorService);
  private breakService = inject(DataManagementBreakService);
  private expensesService = inject(DataManagementExpensesService);
  private appSettingsService = inject(AppSettingsManagementService);
  private injector = inject(Injector);

  public scheduleRefreshed = signal<boolean>(false);
  public shiftScheduleRefreshed = signal<boolean>(false);

  addBreakScheduleEntry(breakEntry: Break): Promise<void> {
    return new Promise((resolve, reject) => {
      this.breakService.addBreak(breakEntry).subscribe({
        next: (response) => {
          if (response.periodHours) {
            this.workScheduleLoader.periodHours.set(breakEntry.clientId, response.periodHours);
          }
          if (response.scheduleEntries && response.scheduleEntries.length > 0) {
            const startDate = addDays(breakEntry.currentDate, -1);
            const endDate = addDays(breakEntry.currentDate, 1);
            this.workScheduleLoader.replaceClientEntriesForDays(breakEntry.clientId, startDate, endDate, response.scheduleEntries);
            this.triggerScheduleRefresh();
          }
          resolve();
        },
        error: (err) => {
          console.error('Error creating break:', err);
          reject(err);
        },
      });
    });
  }

  async bulkAddBreakScheduleEntries(entries: BreakCellParams[]): Promise<void> {
    if (entries.length === 0) return;

    const periodStart = this.workScheduleLoader.startDate
      ? formatDateOnly(this.workScheduleLoader.startDate)
      : formatDateOnly(new Date());
    const periodEnd = this.workScheduleLoader.endDate
      ? formatDateOnly(this.workScheduleLoader.endDate)
      : formatDateOnly(new Date());

    const request = {
      breaks: entries.map(e => ({
        clientId: e.clientId,
        absenceId: e.absenceId,
        currentDate: formatDateOnly(e.date),
        workTime: e.workTime,
        startTime: e.startTime,
        endTime: e.endTime,
        information: e.information,
        description: e.description,
      })),
      periodStart,
      periodEnd,
      paymentInterval: this.injector.get(GroupSelectionService).selectedGroup?.paymentInterval
        ?? this.appSettingsService.workSettings().paymentInterval,
    };

    return new Promise((resolve, reject) => {
      this.breakService.bulkAddBreaks(request).subscribe({
        next: async (response) => {
          if (response.periodHours) {
            for (const [clientId, hours] of Object.entries(response.periodHours)) {
              this.workScheduleLoader.periodHours.set(clientId, hours);
            }
          }

          const clientRanges = this.calculateBulkAddBreakClientDateRanges(entries);

          const refreshPromises: Promise<void>[] = [];
          for (const [clientId, range] of clientRanges) {
            refreshPromises.push(this.refreshClientScheduleForDateRange(clientId, range.start, range.end));
          }

          await Promise.all(refreshPromises);

          this.workScheduleLoader.updateClientNeededRows();
          resolve();
        },
        error: (err) => {
          console.error('Error bulk creating breaks:', err);
          reject(err);
        },
      });
    });
  }

  private calculateBulkAddBreakClientDateRanges(entries: BreakCellParams[]): Map<string, { start: Date; end: Date }> {
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

  addWorkScheduleEntry(params: ScheduleCellParams, workFilter: IWorkFilter): Promise<void> {
    this.updateShiftEngagedLocally(params.shiftId, params.date, 1, workFilter);

    const periodStart = this.workScheduleLoader.startDate
      ? formatDateOnly(this.workScheduleLoader.startDate)
      : formatDateOnly(new Date());
    const periodEnd = this.workScheduleLoader.endDate
      ? formatDateOnly(this.workScheduleLoader.endDate)
      : formatDateOnly(new Date());

    return this.workCrud.createWork({ ...params, periodStart, periodEnd }).then((response) => {
      if (response.periodHours) {
        this.workScheduleLoader.periodHours.set(params.clientId, response.periodHours);
      }
      if (response.scheduleEntries && response.scheduleEntries.length > 0) {
        const startDate = addDays(params.date, -1);
        const endDate = addDays(params.date, 1);
        this.workScheduleLoader.replaceClientEntriesForDays(params.clientId, startDate, endDate, response.scheduleEntries);
        this.triggerScheduleRefresh();
      }
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
        information: e.information,
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

    switch (params.entryType) {
      case WorkScheduleEntryType.Break:
        this.breakService.deleteBreak(params.sourceId, periodStart, periodEnd).subscribe({
          next: (response) => {
            if (response.periodHours) {
              this.workScheduleLoader.periodHours.set(params.clientId, response.periodHours);
            }
            if (response.scheduleEntries && response.scheduleEntries.length >= 0) {
              const startDate = addDays(params.date, -1);
              const endDate = addDays(params.date, 1);
              this.workScheduleLoader.replaceClientEntriesForDays(params.clientId, startDate, endDate, response.scheduleEntries);
              this.triggerScheduleRefresh();
            }

          },
          error: (err) => console.error('Error deleting break:', err),
        });
        break;

      case WorkScheduleEntryType.WorkChange:
        this.dataWorkChangeService.delete(params.id).subscribe({
          next: (response) => {
            if (response.clientResults) {
              let workDate = params.date;
              if (response.work?.currentDate) {
                const [year, month, day] = response.work.currentDate.split('-').map(Number);
                workDate = new Date(year, month - 1, day);
              }
              const startDate = addDays(workDate, -1);
              const endDate = addDays(workDate, 1);

              for (const clientResult of response.clientResults) {
                if (clientResult.periodHours) {
                  this.workScheduleLoader.periodHours.set(clientResult.clientId, clientResult.periodHours);
                }
                if (clientResult.scheduleEntries && clientResult.scheduleEntries.length >= 0) {
                  this.workScheduleLoader.replaceClientEntriesForDays(clientResult.clientId, startDate, endDate, clientResult.scheduleEntries);
                }
              }
              this.triggerScheduleRefresh();
            }

          },
          error: (err) => console.error('Error deleting work change:', err),
        });
        break;

      case WorkScheduleEntryType.Expenses:
        this.expensesService.delete(params.id).subscribe({
          next: () => {
            this.refreshClientScheduleForDays(params.clientId, params.date).then(() => {
              this.triggerScheduleRefresh();
  
            });
          },
          error: (err) => console.error('Error deleting expenses:', err),
        });
        break;

      case WorkScheduleEntryType.Work:
      default:
        this.workCrud.deleteWorkById(params.sourceId, periodStart, periodEnd).then((response) => {
          if (response.periodHours) {
            this.workScheduleLoader.periodHours.set(params.clientId, response.periodHours);
          }
          if (response.scheduleEntries && response.scheduleEntries.length >= 0) {
            const startDate = addDays(params.date, -1);
            const endDate = addDays(params.date, 1);
            this.workScheduleLoader.replaceClientEntriesForDays(params.clientId, startDate, endDate, response.scheduleEntries);
            this.triggerScheduleRefresh();
          }
          this.updateShiftEngagedLocally(params.entryId, params.date, -1, workFilter);
        });
        break;
    }
  }

  bulkDeleteWorkScheduleEntries(entries: DeleteWorkScheduleEntryParams[], workFilter: IWorkFilter): void {
    if (entries.length === 0) return;

    const workEntries = entries.filter(e => e.entryType === WorkScheduleEntryType.Work);
    const workChangeEntries = entries.filter(e => e.entryType === WorkScheduleEntryType.WorkChange);
    const expensesEntries = entries.filter(e => e.entryType === WorkScheduleEntryType.Expenses);
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

    if (workChangeEntries.length > 0) {
      for (const entry of workChangeEntries) {
        deletePromises.push(
          new Promise<void>((resolve, reject) => {
            this.dataWorkChangeService.delete(entry.id).subscribe({
              next: (response) => {
                if (response.clientResults) {
                  for (const clientResult of response.clientResults) {
                    if (clientResult.periodHours) {
                      this.workScheduleLoader.periodHours.set(clientResult.clientId, clientResult.periodHours);
                    }
                  }
                }
                resolve();
              },
              error: (err) => {
                console.error('Error deleting work change:', err);
                reject(err);
              },
            });
          })
        );
      }
    }

    if (breakEntries.length > 0) {
      const breakIds = breakEntries.map(e => e.sourceId);
      deletePromises.push(
        new Promise<void>((resolve, reject) => {
          this.breakService.bulkDeleteBreaks({ breakIds, periodStart, periodEnd }).subscribe({
            next: (response) => {
              if (response.periodHours) {
                for (const [clientId, hours] of Object.entries(response.periodHours)) {
                  this.workScheduleLoader.periodHours.set(clientId, hours);
                }
              }
              resolve();
            },
            error: (err) => {
              console.error('Error bulk deleting breaks:', err);
              reject(err);
            },
          });
        })
      );
    }

    if (expensesEntries.length > 0) {
      for (const entry of expensesEntries) {
        deletePromises.push(
          new Promise<void>((resolve, reject) => {
            this.expensesService.delete(entry.id).subscribe({
              next: () => resolve(),
              error: (err) => {
                console.error('Error deleting expenses:', err);
                reject(err);
              },
            });
          })
        );
      }
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

  public refreshClientScheduleForDateRange(clientId: string, startDate: Date, endDate: Date): Promise<void> {
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

  public triggerScheduleRefresh(): void {
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
