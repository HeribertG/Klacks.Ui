// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IClientWork, IWorkFilter } from 'src/app/domain/models/schedule/schedule-class';
import {
  IPeriodHours,
  IWorkScheduleClient,
  IScheduleCell,
  IWorkScheduleFilter,
  WorkScheduleByClientAndDate,
} from 'src/app/domain/models/schedule/work-schedule-class';
import { DataWorkScheduleService } from 'src/app/infrastructure/api/schedule/data-work-schedule.service';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { CalendarUtilService } from 'src/app/domain/services/calendar-util.service';
import {
  formatDateOnly,
  getDateKeysBetween,
} from 'src/app/shared/helpers/date.helper';
import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import { BreakPlaceholderScheduleLoaderService } from './break-placeholder-schedule-loader.service';
import { ScheduleChangeService } from './schedule-change.service';

@Injectable({
  providedIn: 'root',
})
export class WorkScheduleLoaderService {
  private dataWorkSchedule = inject(DataWorkScheduleService);
  private settingsService = inject(DataManagementSettingsService);
  private calendarUtil = inject(CalendarUtilService);
  private signalRService = inject(SCHEDULE_SIGNALR);
  private breakPlaceholderLoader = inject(BreakPlaceholderScheduleLoaderService);
  private scheduleChangeService = inject(ScheduleChangeService);
  private destroyRef = inject(DestroyRef);

  private readonly INITIAL_CHUNK_SIZE = 50;
  private readonly LOAD_MORE_CHUNK_SIZE = 50;

  private _totalAvailableClients = 0;
  private _currentChunkSize = 50;
  private _autoLoadEnabled = true;
  private _currentFilter: IWorkScheduleFilter | null = null;

  private _isLoadingMore = signal(false);
  private _isRead = signal(false);
  private _currentLoadId = 0;

  public workScheduleEntries: IScheduleCell[] = [];
  public workScheduleByClientAndDate: WorkScheduleByClientAndDate = new Map();
  public clients: IClientWork[] = [];
  public periodHours = new Map<string, IPeriodHours>();
  public clientAvailabilities = new Map<string, Map<string, string>>();
  public startDate: Date | null = null;
  public endDate: Date | null = null;

  // Signal to notify UI when period hours are updated
  public periodHoursUpdated = signal<number>(0);

  constructor() {
    this.subscribeToSignalREvents();
  }

  private subscribeToSignalREvents(): void {
    // PeriodHours come directly from the backend via PeriodHoursUpdated notification
    // The backend calculates them AFTER saving the work, so we can trust these values
    this.signalRService.periodHoursUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notification) => {
        if (notification.sourceConnectionId === this.signalRService.connectionId) return;
        
        const clientId = notification.clientId.toString();

        this.periodHours.set(clientId, {
          hours: notification.hours,
          surcharges: notification.surcharges,
          guaranteedHours: notification.guaranteedHours,
        });

        this.periodHoursUpdated.set(Date.now());
      });

    this.signalRService.periodHoursRecalculated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.refreshAllLoadedPeriodHours();
      });
  }

  private refreshAllLoadedPeriodHours(): void {
    if (this.clients.length === 0 || !this._currentFilter) return;

    const clientIds = this.clients.map((c) => c.id);

    this.dataWorkSchedule
      .getPeriodHours({
        clientIds,
        startDate: this._currentFilter.startDate,
        endDate: this._currentFilter.endDate,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          for (const [clientId, hours] of Object.entries(response)) {
            this.periodHours.set(clientId, hours);
          }
          // Notify UI that period hours have been updated
          this.periodHoursUpdated.set(Date.now());
          this._isRead.set(true);
          setTimeout(() => this._isRead.set(false), 100);
        },
        error: (err) => {
          console.error('Error refreshing all period hours:', err);
        },
      });
  }

  get isLoadingMore(): boolean {
    return this._isLoadingMore();
  }

  get isRead() {
    return this._isRead;
  }

  get hasMoreClients(): boolean {
    return this.clients.length < this._totalAvailableClients;
  }

  get clientLoadingProgress(): number {
    if (this._totalAvailableClients === 0) return 0;
    return Math.round(
      (this.clients.length / this._totalAvailableClients) * 100,
    );
  }

  get totalAvailableClients(): number {
    return this._totalAvailableClients;
  }

  calculateVisibleDates(workFilter: IWorkFilter): {
    startDate: string;
    endDate: string;
  } {
    const periodStartDate = this.calculatePeriodStartDate(workFilter);
    const periodEndDate = this.calculatePeriodEndDate(workFilter);

    const dayVisibleBefore = this.settingsService.dayVisibleBefore;
    const dayVisibleAfter = this.settingsService.dayVisibleAfter;

    const startDate = new Date(periodStartDate);
    startDate.setDate(startDate.getDate() - dayVisibleBefore);

    const endDate = new Date(periodEndDate);
    endDate.setDate(endDate.getDate() + dayVisibleAfter);

    return {
      startDate: formatDateOnly(startDate),
      endDate: formatDateOnly(endDate),
    };
  }

  load(workFilter: IWorkFilter, onLoaded?: () => void): void {
    this._currentLoadId++;
    const loadId = this._currentLoadId;

    this.workScheduleEntries = [];
    this.workScheduleByClientAndDate = new Map();
    this.clients = [];
    this.periodHours = new Map();
    this.clientAvailabilities = new Map();
    this.startDate = null;
    this.endDate = null;
    this._autoLoadEnabled = true;
    this._currentChunkSize = this.LOAD_MORE_CHUNK_SIZE;
    this._isLoadingMore.set(false);
    this.scheduleChangeService.clear();

    const dates = this.calculateVisibleDates(workFilter);

    this._currentFilter = {
      startDate: dates.startDate,
      endDate: dates.endDate,
      selectedGroup: workFilter.selectedGroup || undefined,
      orderBy: workFilter.orderBy || 'name',
      sortOrder: workFilter.sortOrder || 'asc',
      showEmployees: workFilter.showEmployees ?? true,
      showExtern: workFilter.showExtern ?? true,
      hoursSortOrder: workFilter.hoursSortOrder || undefined,
      startRow: 0,
      rowCount: this.INITIAL_CHUNK_SIZE,
      paymentInterval: workFilter.paymentInterval,
    };

    this.dataWorkSchedule
      .getWorkSchedule(this._currentFilter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (loadId !== this._currentLoadId) return;

          this.workScheduleEntries = response.entries ?? [];
          this.workScheduleByClientAndDate = this.groupByClientAndDate(
            this.workScheduleEntries,
          );
          this.clients = this.convertToClientWork(response.clients ?? []);
          this.periodHours = new Map(
            Object.entries(response.periodHours ?? {}),
          );
          this.mergeClientAvailabilities(response.clientAvailabilities);
          this._totalAvailableClients = response.totalClientCount;
          this.startDate = new Date(response.startDate);
          this.endDate = new Date(response.endDate);
          this.updateClientNeededRows();
          this.applyBreakPlaceholderRows();

          this._isRead.set(true);
          setTimeout(() => this._isRead.set(false), 100);

          this.joinSignalRGroup(dates.startDate, dates.endDate);
          this.scheduleChangeService.loadDirtyClients(dates.startDate, dates.endDate);

          onLoaded?.();

          if (this._autoLoadEnabled && this.hasMoreClients) {
            setTimeout(() => this.autoLoadNextChunk(loadId), 100);
          }
        },
        error: (err) => {
          console.error('Error loading work schedule:', err);
        },
      });
  }

  private autoLoadNextChunk(loadId: number): void {
    if (loadId !== this._currentLoadId) return;
    if (
      !this._autoLoadEnabled ||
      !this.hasMoreClients ||
      this._isLoadingMore() ||
      !this._currentFilter
    ) {
      return;
    }

    this._isLoadingMore.set(true);
    this._currentFilter.startRow = this.clients.length;
    this._currentFilter.rowCount = this._currentChunkSize;

    this.dataWorkSchedule
      .getWorkSchedule(this._currentFilter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (loadId !== this._currentLoadId) {
            this._isLoadingMore.set(false);
            return;
          }

          const newEntries = response.entries ?? [];
          const newClients = response.clients ?? [];

          this.workScheduleEntries.push(...newEntries);
          this.mergeIntoGroupedData(newEntries);
          this.clients.push(...this.convertToClientWork(newClients));

          for (const [key, value] of Object.entries(
            response.periodHours ?? {},
          )) {
            this.periodHours.set(key, value);
          }

          this.mergeClientAvailabilities(response.clientAvailabilities);

          this.updateClientNeededRows();
          this.applyBreakPlaceholderRows();

          if (newClients.length < this._currentChunkSize) {
            this._totalAvailableClients = this.clients.length;
            this._autoLoadEnabled = false;
          } else {
            this._currentChunkSize = Math.min(this._currentChunkSize * 2, 100);
          }

          this._isLoadingMore.set(false);
          this._isRead.set(true);
          setTimeout(() => this._isRead.set(false), 100);

          if (this._autoLoadEnabled && this.hasMoreClients) {
            setTimeout(() => this.autoLoadNextChunk(loadId), 50);
          }
        },
        error: (err) => {
          console.error('Error auto-loading work schedule:', err);
          this._isLoadingMore.set(false);
          this._autoLoadEnabled = false;
        },
      });
  }

  getWorkScheduleForClientAndDate(
    clientId: string,
    date: Date,
  ): IScheduleCell[] {
    const dateKey = formatDateOnly(date);
    const clientMap = this.workScheduleByClientAndDate.get(clientId);
    if (!clientMap) {
      return [];
    }
    return clientMap.get(dateKey) || [];
  }

  getMaxEntriesPerClientAndDate(): Map<string, number> {
    const result = new Map<string, number>();

    for (const [clientId, dateMap] of this.workScheduleByClientAndDate) {
      const lengths = Array.from(dateMap.values(), (entries) => entries.length);
      result.set(clientId, Math.max(0, ...lengths));
    }

    return result;
  }

  private calculatePeriodStartDate(filter: IWorkFilter): Date {
    const paymentInterval = filter.paymentInterval;
    const year = filter.currentYear;

    switch (paymentInterval) {
      case 0:
        return this.calendarUtil.getWeekStartDate(
          year,
          filter.currentWeek ?? 1,
        );
      case 1:
        return this.calendarUtil.getBiweeklyStartDate(
          year,
          filter.currentWeek ?? 1,
        );
      case 2:
      default:
        return new Date(year, filter.currentMonth - 1, 1);
    }
  }

  private calculatePeriodEndDate(filter: IWorkFilter): Date {
    const paymentInterval = filter.paymentInterval;
    const year = filter.currentYear;

    switch (paymentInterval) {
      case 0:
        return this.calendarUtil.getWeekEndDate(year, filter.currentWeek ?? 1);
      case 1:
        return this.calendarUtil.getBiweeklyEndDate(
          year,
          filter.currentWeek ?? 1,
        );
      case 2:
      default:
        return new Date(year, filter.currentMonth, 0);
    }
  }

  private convertToClientWork(clients: IWorkScheduleClient[]): IClientWork[] {
    return clients.map((c) => ({
      id: c.id,
      company: c.company ?? undefined,
      firstName: c.firstName ?? undefined,
      name: c.name ?? undefined,
      secondName: c.secondName ?? undefined,
      title: c.title ?? undefined,
      maidenName: c.maidenName ?? undefined,
      gender: c.gender,
      idNumber: c.idNumber,
      legalEntity: c.legalEntity,
      type: c.type,
      membershipId: '',
      neededRows: 2,
      displayRows: 2,
      works: [],
      hasContract: c.hasContract ?? false,
    }));
  }

  public updateClientNeededRows(): void {
    const maxEntriesMap = this.getMaxEntriesPerClientAndDate();
    const MIN_ROWS = 2;

    for (const client of this.clients) {
      if (client.id) {
        const workMax = (maxEntriesMap.get(client.id) || 0) + 1;
        client.neededRows = Math.max(MIN_ROWS, workMax);
      } else {
        client.neededRows = MIN_ROWS;
      }
      client.displayRows = client.neededRows;
    }

    this.applyBreakPlaceholderRows();
  }

  public resetToNeededRows(): void {
    for (const client of this.clients) {
      client.displayRows = client.neededRows;
    }
  }

  public applyBreakPlaceholderRows(): void {
    if (!this.breakPlaceholderLoader.visible) return;
    if (!this.startDate || !this.endDate) return;

    const breakMaxMap =
      this.breakPlaceholderLoader.getMaxBreakPlaceholdersPerClientAndDay(
        formatDateOnly(this.startDate),
        formatDateOnly(this.endDate),
      );

    for (const client of this.clients) {
      if (client.id) {
        const breakMax = breakMaxMap.get(client.id) || 0;
        client.displayRows = client.neededRows + breakMax;
      }
    }
  }

  private groupByClientAndDate(
    entries: IScheduleCell[],
  ): WorkScheduleByClientAndDate {
    const result: WorkScheduleByClientAndDate = new Map();

    for (const entry of entries) {
      const clientId = entry.clientId;
      const dateKey = formatDateOnly(new Date(entry.entryDate));

      if (!result.has(clientId)) {
        result.set(clientId, new Map());
      }

      const clientMap = result.get(clientId)!;
      if (!clientMap.has(dateKey)) {
        clientMap.set(dateKey, []);
      }

      clientMap.get(dateKey)!.push(entry);
    }

    return result;
  }

  private mergeIntoGroupedData(entries: IScheduleCell[]): void {
    for (const entry of entries) {
      const clientId = entry.clientId;
      const dateKey = formatDateOnly(new Date(entry.entryDate));

      if (!this.workScheduleByClientAndDate.has(clientId)) {
        this.workScheduleByClientAndDate.set(clientId, new Map());
      }

      const clientMap = this.workScheduleByClientAndDate.get(clientId)!;
      if (!clientMap.has(dateKey)) {
        clientMap.set(dateKey, []);
      }

      clientMap.get(dateKey)!.push(entry);
    }
  }

  replaceClientEntriesForDays(
    clientId: string,
    startDate: Date,
    endDate: Date,
    newEntries: IScheduleCell[],
  ): void {
    const dateKeys = getDateKeysBetween(startDate, endDate);

    this.workScheduleEntries = this.workScheduleEntries.filter((entry) => {
      if (entry.clientId !== clientId) return true;
      const entryDateKey = formatDateOnly(new Date(entry.entryDate));
      return !dateKeys.includes(entryDateKey);
    });

    const clientMap = this.workScheduleByClientAndDate.get(clientId);
    if (clientMap) {
      for (const dateKey of dateKeys) {
        clientMap.delete(dateKey);
      }
    }

    for (const entry of newEntries) {
      this.workScheduleEntries.push(entry);

      const dateKey = formatDateOnly(new Date(entry.entryDate));
      if (!this.workScheduleByClientAndDate.has(clientId)) {
        this.workScheduleByClientAndDate.set(clientId, new Map());
      }
      const map = this.workScheduleByClientAndDate.get(clientId)!;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(entry);
    }

    this.updateClientNeededRows();
  }

  private calculatePeriodDates(workFilter: IWorkFilter): {
    startDate: string;
    endDate: string;
  } {
    const periodStartDate = this.calculatePeriodStartDate(workFilter);
    const periodEndDate = this.calculatePeriodEndDate(workFilter);

    return {
      startDate: formatDateOnly(periodStartDate),
      endDate: formatDateOnly(periodEndDate),
    };
  }

  private mergeClientAvailabilities(
    availabilities: Record<string, Record<string, string>> | null | undefined,
  ): void {
    if (!availabilities) return;

    for (const [clientId, dates] of Object.entries(availabilities)) {
      if (!this.clientAvailabilities.has(clientId)) {
        this.clientAvailabilities.set(clientId, new Map());
      }
      const clientMap = this.clientAvailabilities.get(clientId)!;
      for (const [dateKey, ranges] of Object.entries(dates)) {
        clientMap.set(dateKey, ranges);
      }
    }
  }

  private joinSignalRGroup(startDate: string, endDate: string): void {
    this.signalRService.joinScheduleGroup(startDate, endDate);
  }
}
