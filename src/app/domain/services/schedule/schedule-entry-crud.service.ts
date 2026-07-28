// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * CRUD service for schedule entries (Work, Break, Expenses, Notes, WorkChange).
 * @param dataWorkSchedule - API service for WorkSchedule data
 * @param workCrud - Service for Work CRUD operations
 * @param breakService - Service for Break CRUD operations
 * @param shiftLoader - Service for loading shift schedules
 * @param workScheduleLoader - Service for loading work schedules
 */

import { inject, Injectable, Injector, signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { IPeriodHours, IScheduleCell, IWorkScheduleFilter, WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';
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
import { DataManagementScheduleNoteService } from '../schedule-note/data-management-schedule-note.service';
import { DataManagementScheduleCommandService } from '../schedule-command/data-management-schedule-command.service';
import { Break } from '../../models/break/break-class';
import { AppSettingsManagementService } from '../settings/app-settings-management.service';
import { GroupSelectionService } from '../group/group-selection.service';
import { AnalyseScenarioService } from './analyse-scenario.service';
import { resetSignalAfterDelay } from 'src/app/shared/helpers/signal-pulse.helper';
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
  private dataWorkSchedule = inject(DataWorkScheduleService);
  private dataWorkChangeService = inject(DataManagementWorkchangeService);
  private shiftLoader = inject(ShiftScheduleLoaderService);
  private workScheduleLoader = inject(WorkScheduleLoaderService);
  private workCrud = inject(DataManagementWorkService);
  private availableShiftsCalc = inject(AvailableShiftsCalculatorService);
  private breakService = inject(DataManagementBreakService);
  private expensesService = inject(DataManagementExpensesService);
  private scheduleNoteService = inject(DataManagementScheduleNoteService);
  private scheduleCommandService = inject(DataManagementScheduleCommandService);
  private appSettingsService = inject(AppSettingsManagementService);
  private analyseScenarioService = inject(AnalyseScenarioService);
  private injector = inject(Injector);

  public scheduleRefreshed = signal<boolean>(false);
  public shiftScheduleRefreshed = signal<boolean>(false);

  async addBreakScheduleEntry(breakEntry: Break): Promise<void> {
    const response = await firstValueFrom(this.breakService.addBreak(breakEntry));
    if (response.periodHours) {
      this.workScheduleLoader.periodHours.set(breakEntry.clientId, response.periodHours);
    }
    if (response.scheduleEntries && response.scheduleEntries.length > 0) {
      const startDate = addDays(breakEntry.currentDate, -1);
      const endDate = addDays(breakEntry.currentDate, 1);
      this.workScheduleLoader.replaceClientEntriesForDays(breakEntry.clientId, startDate, endDate, response.scheduleEntries);
      this.triggerScheduleRefresh();
    }
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

    const response = await firstValueFrom(this.breakService.bulkAddBreaks(request));

    if (response.periodHours) {
      for (const [clientId, hours] of Object.entries(response.periodHours)) {
        this.workScheduleLoader.periodHours.set(clientId, hours);
      }
    }

    const clientRanges = this.calculateBulkAddBreakClientDateRanges(entries);
    const bundle = this.bundleSimpleClientRanges(clientRanges);
    if (bundle) {
      await this.refreshClientsBulkForDateRange(bundle.clientIds, bundle.start, bundle.end);
    }

    this.workScheduleLoader.updateClientNeededRows();
  }

  private bundleSimpleClientRanges(
    clientRanges: Map<string, { start: Date; end: Date }>,
  ): { clientIds: string[]; start: Date; end: Date } | undefined {
    const clientIds: string[] = [];
    let minStart: Date | undefined;
    let maxEnd: Date | undefined;
    for (const [clientId, range] of clientRanges) {
      clientIds.push(clientId);
      if (!minStart || range.start < minStart) minStart = range.start;
      if (!maxEnd || range.end > maxEnd) maxEnd = range.end;
    }
    if (clientIds.length === 0 || !minStart || !maxEnd) return undefined;
    return { clientIds, start: minStart, end: maxEnd };
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

  async reassignWorkScheduleEntry(workId: string, sourceClientId: string, targetClientId: string, date: Date): Promise<void> {
    const response = await this.workCrud.reassignWorkClient(workId, targetClientId);

    if (response.work.periodHours) {
      this.workScheduleLoader.periodHours.set(targetClientId, response.work.periodHours);
    }

    const startDate = addDays(date, -1);
    const endDate = addDays(date, 1);
    this.workScheduleLoader.replaceClientEntriesForDays(targetClientId, startDate, endDate, response.work.scheduleEntries ?? []);
    this.workScheduleLoader.replaceClientEntriesForDays(sourceClientId, startDate, endDate, response.sourceScheduleEntries);
    this.triggerScheduleRefresh();
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
    const bundle = this.bundleSimpleClientRanges(clientRanges);
    if (bundle) {
      await this.refreshClientsBulkForDateRange(bundle.clientIds, bundle.start, bundle.end);
    }

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

  async deleteWorkScheduleEntry(params: DeleteWorkScheduleEntryParams, workFilter: IWorkFilter): Promise<void> {
    const { periodStart, periodEnd } = this.getLoaderPeriodRange();

    switch (params.entryType) {
      case WorkScheduleEntryType.Break: {
        const response = await firstValueFrom(this.breakService.deleteBreak(params.sourceId, periodStart, periodEnd));
        this.applySingleClientDeleteResponse(response, params.clientId, params.date);
        break;
      }

      case WorkScheduleEntryType.WorkChange: {
        const response = await firstValueFrom(this.dataWorkChangeService.delete(params.id));
        this.applyWorkChangeDeleteResponse(response, params.date);
        break;
      }

      case WorkScheduleEntryType.Expenses: {
        const response = await firstValueFrom(this.expensesService.delete(params.id));
        this.applySingleClientDeleteResponse(response, params.clientId, params.date);
        break;
      }

      case WorkScheduleEntryType.ScheduleNote:
      case WorkScheduleEntryType.ScheduleCommand: {
        await firstValueFrom(this.getGenericDeleter(params.entryType)(params.id));
        await this.refreshClientScheduleForDays(params.clientId, params.date);
        this.triggerScheduleRefresh();
        break;
      }

      case WorkScheduleEntryType.Work:
      default: {
        const response = await this.workCrud.deleteWorkById(params.sourceId, periodStart, periodEnd);
        this.applySingleClientDeleteResponse(response, params.clientId, params.date);
        this.updateShiftEngagedLocally(params.entryId, params.date, -1, workFilter);
        break;
      }
    }
  }

  private getLoaderPeriodRange(): { periodStart: string; periodEnd: string } {
    const fallback = new Date();
    return {
      periodStart: formatDateOnly(this.workScheduleLoader.startDate ?? fallback),
      periodEnd: formatDateOnly(this.workScheduleLoader.endDate ?? fallback),
    };
  }

  public applyExpensesSingleClientResponse(
    response: { periodHours?: IPeriodHours | null; scheduleEntries?: IScheduleCell[] | null },
    clientId: string,
    centerDate: Date,
  ): void {
    this.applySingleClientDeleteResponse(response, clientId, centerDate);
  }

  private applySingleClientDeleteResponse(
    response: { periodHours?: IPeriodHours | null; scheduleEntries?: IScheduleCell[] | null },
    clientId: string,
    centerDate: Date,
  ): void {
    if (response.periodHours)
      this.workScheduleLoader.periodHours.set(clientId, response.periodHours);

    if (!response.scheduleEntries || response.scheduleEntries.length < 0) return;

    const startDate = addDays(centerDate, -1);
    const endDate = addDays(centerDate, 1);
    this.workScheduleLoader.replaceClientEntriesForDays(clientId, startDate, endDate, response.scheduleEntries);
    this.triggerScheduleRefresh();
  }

  private applyWorkChangeDeleteResponse(
    response: { clientResults?: { clientId: string; periodHours?: IPeriodHours | null; scheduleEntries?: IScheduleCell[] | null }[] | null; work?: { currentDate?: string } | null },
    fallbackDate: Date,
  ): void {
    if (!response.clientResults) return;

    const workDate = this.resolveWorkDate(response.work?.currentDate, fallbackDate);
    const startDate = addDays(workDate, -1);
    const endDate = addDays(workDate, 1);

    for (const clientResult of response.clientResults) {
      if (clientResult.periodHours)
        this.workScheduleLoader.periodHours.set(clientResult.clientId, clientResult.periodHours);
      if (clientResult.scheduleEntries && clientResult.scheduleEntries.length >= 0)
        this.workScheduleLoader.replaceClientEntriesForDays(clientResult.clientId, startDate, endDate, clientResult.scheduleEntries);
    }
    this.triggerScheduleRefresh();
  }

  private resolveWorkDate(currentDate: string | undefined, fallback: Date): Date {
    if (!currentDate) return fallback;
    const [year, month, day] = currentDate.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private getGenericDeleter(entryType: WorkScheduleEntryType): (id: string) => Observable<unknown> {
    switch (entryType) {
      case WorkScheduleEntryType.Expenses: return (id) => this.expensesService.delete(id);
      case WorkScheduleEntryType.ScheduleNote: return (id) => this.scheduleNoteService.delete(id);
      case WorkScheduleEntryType.ScheduleCommand: return (id) => this.scheduleCommandService.delete(id);
      default: throw new Error(`No generic deleter for entry type ${entryType}`);
    }
  }

  async bulkDeleteWorkScheduleEntries(entries: DeleteWorkScheduleEntryParams[], workFilter: IWorkFilter): Promise<void> {
    if (entries.length === 0) return;

    const grouped = this.groupEntriesByType(entries);
    const { periodStart, periodEnd } = this.getLoaderPeriodRange();

    await Promise.all(this.buildBulkDeletePromises(grouped, periodStart, periodEnd));
    await Promise.all(this.buildBulkRefreshPromises(entries));

    this.bulkUpdateShiftEngagedLocally(entries, workFilter);
    this.workScheduleLoader.updateClientNeededRows();
  }

  private groupEntriesByType(entries: DeleteWorkScheduleEntryParams[]): Map<WorkScheduleEntryType, DeleteWorkScheduleEntryParams[]> {
    const groups = new Map<WorkScheduleEntryType, DeleteWorkScheduleEntryParams[]>();
    for (const entry of entries) {
      const bucket = groups.get(entry.entryType) ?? [];
      bucket.push(entry);
      groups.set(entry.entryType, bucket);
    }
    return groups;
  }

  private buildBulkDeletePromises(
    grouped: Map<WorkScheduleEntryType, DeleteWorkScheduleEntryParams[]>,
    periodStart: string,
    periodEnd: string,
  ): Promise<void>[] {
    const promises: Promise<void>[] = [];

    const workIds = (grouped.get(WorkScheduleEntryType.Work) ?? []).map(e => e.sourceId);
    if (workIds.length > 0)
      promises.push(this.workCrud.bulkDeleteWorks(workIds).then(r => this.applyBulkPeriodHours(r)));

    for (const entry of grouped.get(WorkScheduleEntryType.WorkChange) ?? [])
      promises.push(firstValueFrom(this.dataWorkChangeService.delete(entry.id)).then(r => this.applyWorkChangeBulkResponse(r)));

    const breakIds = (grouped.get(WorkScheduleEntryType.Break) ?? []).map(e => e.sourceId);
    if (breakIds.length > 0)
      promises.push(firstValueFrom(this.breakService.bulkDeleteBreaks({ breakIds, periodStart, periodEnd })).then(r => this.applyBulkPeriodHours(r)));

    for (const entryType of [WorkScheduleEntryType.Expenses, WorkScheduleEntryType.ScheduleNote, WorkScheduleEntryType.ScheduleCommand]) {
      for (const entry of grouped.get(entryType) ?? [])
        promises.push(firstValueFrom(this.getGenericDeleter(entryType)(entry.id)).then(() => { /* no post-processing */ }));
    }

    return promises;
  }

  private applyBulkPeriodHours(response: { periodHours?: Record<string, IPeriodHours> | null }): void {
    if (!response.periodHours) return;
    for (const [clientId, hours] of Object.entries(response.periodHours))
      this.workScheduleLoader.periodHours.set(clientId, hours);
  }

  private applyWorkChangeBulkResponse(response: { clientResults?: { clientId: string; periodHours?: IPeriodHours | null }[] | null }): void {
    if (!response.clientResults) return;
    for (const clientResult of response.clientResults) {
      if (clientResult.periodHours)
        this.workScheduleLoader.periodHours.set(clientResult.clientId, clientResult.periodHours);
    }
  }

  private buildBulkRefreshPromises(entries: DeleteWorkScheduleEntryParams[]): Promise<void>[] {
    const clientRanges = this.collectClientDateRanges(entries);
    const bundle = this.bundleClientsAndRange(clientRanges);
    if (!bundle) return [];
    return [this.refreshClientsBulkForDateRange(bundle.clientIds, bundle.start, bundle.end)];
  }

  private bundleClientsAndRange(
    clientRanges: Map<string, { start: Date; end: Date }[]>,
  ): { clientIds: string[]; start: Date; end: Date } | undefined {
    const clientIds: string[] = [];
    let minStart: Date | undefined;
    let maxEnd: Date | undefined;
    for (const [clientId, ranges] of clientRanges) {
      const merged = this.mergeClientDateRanges(ranges);
      if (merged.length === 0) continue;
      clientIds.push(clientId);
      for (const range of merged) {
        if (!minStart || range.start < minStart) minStart = range.start;
        if (!maxEnd || range.end > maxEnd) maxEnd = range.end;
      }
    }
    if (clientIds.length === 0 || !minStart || !maxEnd) return undefined;
    return { clientIds, start: minStart, end: maxEnd };
  }

  public async refreshClientsBulkForDateRange(
    clientIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    if (clientIds.length === 0) return;
    const filter = this.buildRefreshFilter(startDate, endDate);
    filter.clientIds = clientIds;

    const response = await firstValueFrom(this.dataWorkSchedule.getWorkSchedule(filter));
    const entriesByClient = new Map<string, IScheduleCell[]>();
    for (const entry of response.entries) {
      const bucket = entriesByClient.get(entry.clientId) ?? [];
      bucket.push(entry);
      entriesByClient.set(entry.clientId, bucket);
    }

    for (const clientId of clientIds) {
      const clientEntries = entriesByClient.get(clientId) ?? [];
      this.workScheduleLoader.replaceClientEntriesForDays(clientId, startDate, endDate, clientEntries);
    }

    this.triggerScheduleRefresh();
  }

  private collectClientDateRanges(entries: DeleteWorkScheduleEntryParams[]): Map<string, { start: Date; end: Date }[]> {
    const clientShiftDates = new Map<string, Set<number>>();
    for (const entry of entries) {
      const key = `${entry.clientId}|${entry.entryId}`;
      const dates = clientShiftDates.get(key) ?? new Set<number>();
      dates.add(entry.date.getTime());
      clientShiftDates.set(key, dates);
    }

    const clientRanges = new Map<string, { start: Date; end: Date }[]>();
    for (const [key, dates] of clientShiftDates) {
      const clientId = key.split('|')[0];
      const sortedDates = Array.from(dates).sort((a, b) => a - b);
      const ranges = this.mergeOverlappingDateRanges(sortedDates);

      const existing = clientRanges.get(clientId) ?? [];
      existing.push(...ranges);
      clientRanges.set(clientId, existing);
    }
    return clientRanges;
  }

  private buildRefreshFilter(startDate: Date, endDate: Date): IWorkScheduleFilter {
    const groupSelection = this.injector.get(GroupSelectionService);
    return {
      startDate: formatDateOnly(startDate),
      endDate: formatDateOnly(endDate),
      analyseToken: this.analyseScenarioService.activeToken() ?? undefined,
      selectedGroup: groupSelection.selectedGroupId ?? undefined,
    };
  }

  public refreshClientScheduleForDays(clientId: string, centerDate: Date): Promise<void> {
    const startDate = addDays(centerDate, -1);
    const endDate = addDays(centerDate, 1);
    return this.refreshClientScheduleForDateRange(clientId, startDate, endDate);
  }

  public async refreshClientScheduleForDateRange(clientId: string, startDate: Date, endDate: Date): Promise<void> {
    const filter = this.buildRefreshFilter(startDate, endDate);
    filter.clientId = clientId;

    const response = await firstValueFrom(this.dataWorkSchedule.getWorkSchedule(filter));
    const clientEntries = response.entries.filter(e => e.clientId === clientId);

    this.workScheduleLoader.replaceClientEntriesForDays(clientId, startDate, endDate, clientEntries);

    this.triggerScheduleRefresh();
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
    resetSignalAfterDelay(this.scheduleRefreshed);
  }

  private triggerShiftScheduleRefresh(): void {
    this.shiftScheduleRefreshed.set(true);
    resetSignalAfterDelay(this.shiftScheduleRefreshed);
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
