// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { effect, inject, Injectable, Injector, runInInjectionContext, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { IClientWork, IWorkFilter } from 'src/app/domain/models/schedule/schedule-class';
import {
  IPeriodHours,
  IWorkScheduleClient,
  IScheduleCell,
  IWorkScheduleFilter,
  IWorkScheduleResponse,
  WorkScheduleByClientAndDate,
} from 'src/app/domain/models/schedule/work-schedule-class';
import { DataWorkScheduleService } from 'src/app/infrastructure/api/schedule/data-work-schedule.service';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { CalendarUtilService } from 'src/app/domain/services/calendar-util.service';
import {
  formatDateOnly,
  getDateKeysBetween,
} from 'src/app/shared/helpers/date.helper';
import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import { BreakPlaceholderScheduleLoaderService } from './break-placeholder-schedule-loader.service';
import { ScheduleChangeService } from './schedule-change.service';
import { AnalyseScenarioService } from './analyse-scenario.service';
import { DataPeriodClosingService } from 'src/app/infrastructure/api/period-closing/data-period-closing.service';
import { ChunkLoader } from './chunk-loader';

@Injectable({
  providedIn: 'root',
})
export class WorkScheduleLoaderService {
  private dataWorkSchedule = inject(DataWorkScheduleService);
  private settingsService = inject(DataManagementSettingsService);
  private groupService = inject(DataManagementGroupService);
  private calendarUtil = inject(CalendarUtilService);
  private signalRService = inject(SCHEDULE_SIGNALR);
  private breakPlaceholderLoader = inject(BreakPlaceholderScheduleLoaderService);
  private scheduleChangeService = inject(ScheduleChangeService);
  private analyseScenarioService = inject(AnalyseScenarioService);
  private periodClosingService = inject(DataPeriodClosingService);
  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);

  private readonly INITIAL_CHUNK_SIZE = 50;
  private readonly LOAD_MORE_CHUNK_SIZE = 50;
  private readonly MAX_CHUNK_SIZE = 100;

  private _totalAvailableClients = 0;
  private _currentFilter: IWorkScheduleFilter | null = null;
  private _isRead = signal(0);

  public workScheduleEntries: IScheduleCell[] = [];
  public workScheduleByClientAndDate: WorkScheduleByClientAndDate = new Map();
  public clients: IClientWork[] = [];
  public periodHours = new Map<string, IPeriodHours>();
  public clientAvailabilities = new Map<string, Map<string, string>>();
  public startDate: Date | null = null;
  public endDate: Date | null = null;

  public periodHoursUpdated = signal<number>(0);
  public sealedDates = new Set<string>();

  private _pendingDates?: { startDate: string; endDate: string };
  private _pendingWorkFilter?: IWorkFilter;

  private _lastJoinedRange: { startDate: string; endDate: string } | null = null;
  private _lastJoinedToken: string | null = this.analyseScenarioService.activeToken();

  private readonly chunkLoader = new ChunkLoader<IWorkScheduleFilter, IWorkScheduleResponse>({
    destroyRef: this.destroyRef,
    initialChunkSize: this.LOAD_MORE_CHUNK_SIZE,
    maxChunkSize: this.MAX_CHUNK_SIZE,
    fetch: (filter) => this.dataWorkSchedule.getWorkSchedule(filter),
    onInitialResponse: (response) => this.applyInitialResponse(response),
    onChunkResponse: (response, chunkSize) => this.applyChunkResponse(response, chunkSize),
    hasMore: () => this.clients.length < this._totalAvailableClients,
    nextChunkFilter: (chunkSize) => {
      if (!this._currentFilter) {
        throw new Error('nextChunkFilter called without a current filter');
      }
      this._currentFilter.startRow = this.clients.length;
      this._currentFilter.rowCount = chunkSize;
      return this._currentFilter;
    },
    onInitialError: (err) => this.tryRecoverFromStaleGroup(err),
  });

  constructor() {
    this.subscribeToSignalREvents();
    this.setupScenarioTokenEffect();
  }

  private setupScenarioTokenEffect(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const token = this.analyseScenarioService.activeToken();
        if (token === this._lastJoinedToken) return;

        const previousToken = this._lastJoinedToken;
        this._lastJoinedToken = token;

        if (!this._lastJoinedRange) return;

        const { startDate, endDate } = this._lastJoinedRange;
        void this.switchScheduleGroupToken(startDate, endDate, previousToken, token);
      });
    });
  }

  private async switchScheduleGroupToken(
    startDate: string,
    endDate: string,
    previousToken: string | null,
    newToken: string | null,
  ): Promise<void> {
    await this.signalRService.leaveScheduleGroup(startDate, endDate, previousToken);
    await this.signalRService.joinScheduleGroup(startDate, endDate, newToken);
  }

  private applyInitialResponse(response: IWorkScheduleResponse): void {
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

    this.loadSealedDates(response.startDate, response.endDate);
    this._isRead.update((v) => v + 1);

    const selectedGroup = this._pendingWorkFilter?.selectedGroup ?? '';
    this.signalRService.setSelectedGroup(selectedGroup);
    if (this._pendingDates) {
      this.joinSignalRGroup(this._pendingDates.startDate, this._pendingDates.endDate);
      this.scheduleChangeService.loadDirtyClients(this._pendingDates.startDate, this._pendingDates.endDate);
    }
  }

  private applyChunkResponse(response: IWorkScheduleResponse, chunkSize: number): void {
    const newEntries = response.entries ?? [];
    const newClients = response.clients ?? [];

    this.workScheduleEntries.push(...newEntries);
    this.mergeIntoGroupedData(newEntries);
    this.clients.push(...this.convertToClientWork(newClients));

    for (const [key, value] of Object.entries(response.periodHours ?? {})) {
      this.periodHours.set(key, value);
    }

    this.mergeClientAvailabilities(response.clientAvailabilities);
    this.updateClientNeededRows();
    this.applyBreakPlaceholderRows();

    if (newClients.length < chunkSize) {
      this._totalAvailableClients = this.clients.length;
    }

    this._isRead.update((v) => v + 1);
  }

  private tryRecoverFromStaleGroup(err: unknown): boolean {
    if (!(err instanceof HttpErrorResponse)) return false;
    if (err.status !== 404) return false;
    if (!this._pendingWorkFilter?.selectedGroup) return false;

    console.warn('Schedule load returned 404 for group - clearing stale group filter and retrying');
    this._pendingWorkFilter.selectedGroup = undefined;
    if (this._currentFilter) {
      this._currentFilter.selectedGroup = undefined;
      const retryFilter = this._currentFilter;
      setTimeout(() => this.chunkLoader.retryInitial(retryFilter), 0);
    }
    return true;
  }

  private subscribeToSignalREvents(): void {
    // PeriodHours come directly from the backend via PeriodHoursUpdated notification
    // The backend calculates them AFTER saving the work, so we can trust these values
    this.signalRService.periodHoursUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notification) => {
        if ((notification.analyseToken ?? null) !== (this.analyseScenarioService.activeToken() ?? null)) {
          return;
        }
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
      .subscribe((notification) => {
        if ((notification.analyseToken ?? null) !== (this.analyseScenarioService.activeToken() ?? null)) {
          return;
        }
        this.refreshAllLoadedPeriodHours();
      });
  }

  refreshAllLoadedPeriodHours(): void {
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
        next: (response: Record<string, IPeriodHours>) => {
          for (const [clientId, hours] of Object.entries(response)) {
            this.periodHours.set(clientId, hours);
          }
          // Notify UI that period hours have been updated
          this.periodHoursUpdated.set(Date.now());
          this._isRead.update(v => v + 1);
        },
        error: (err) => {
          console.error('Error refreshing all period hours:', err);
        },
      });
  }

  get isLoadingMore(): boolean {
    return this.chunkLoader.isLoadingMore();
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

    const dayVisibleBefore = this.settingsService.appSettings.workSettings().dayVisibleBefore;
    const dayVisibleAfter = this.settingsService.appSettings.workSettings().dayVisibleAfter;

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
    this.workScheduleEntries = [];
    this.workScheduleByClientAndDate = new Map();
    this.clients = [];
    this.periodHours = new Map();
    this.clientAvailabilities = new Map();
    this.startDate = null;
    this.endDate = null;
    this.scheduleChangeService.clear();

    this.validateSelectedGroup(workFilter);

    const dates = this.calculateVisibleDates(workFilter);
    this._pendingDates = dates;
    this._pendingWorkFilter = workFilter;

    this._currentFilter = {
      startDate: dates.startDate,
      endDate: dates.endDate,
      selectedGroup: workFilter.selectedGroup || undefined,
      searchString: workFilter.searchString || '',
      orderBy: workFilter.orderBy || 'name',
      sortOrder: workFilter.sortOrder || 'asc',
      showEmployees: workFilter.showEmployees ?? true,
      showExtern: workFilter.showExtern ?? true,
      hoursSortOrder: workFilter.hoursSortOrder || undefined,
      startRow: 0,
      rowCount: this.INITIAL_CHUNK_SIZE,
      paymentInterval: workFilter.paymentInterval,
      analyseToken: this.analyseScenarioService.activeToken() ?? undefined,
    };

    this.chunkLoader.load(this._currentFilter, onLoaded);
  }

  private validateSelectedGroup(workFilter: IWorkFilter): void {
    if (!workFilter.selectedGroup) return;

    const availableGroups = this.groupService.flatNodeList;
    if (availableGroups.length === 0) return;

    const groupExists = availableGroups.some(
      (g) => g.id === workFilter.selectedGroup,
    );

    if (!groupExists) {
      workFilter.selectedGroup = undefined;
    }
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
    const token = this.analyseScenarioService.activeToken();

    if (
      this._lastJoinedRange &&
      (this._lastJoinedRange.startDate !== startDate || this._lastJoinedRange.endDate !== endDate)
    ) {
      void this.signalRService.leaveScheduleGroup(
        this._lastJoinedRange.startDate,
        this._lastJoinedRange.endDate,
        this._lastJoinedToken,
      );
    }

    this._lastJoinedRange = { startDate, endDate };
    this._lastJoinedToken = token;
    this.signalRService.joinScheduleGroup(startDate, endDate, token);
  }

  private loadSealedDates(startDate: string, endDate: string): void {
    this.periodClosingService.getSealedPeriods(startDate, endDate, null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summaries) => {
          this.sealedDates = new Set(
            summaries.filter((s) => s.isFullySealed).map((s) => s.date),
          );
        },
        error: (err) => {
          console.error('Failed to load sealed periods', { startDate, endDate, error: err });
          this.sealedDates = new Set();
        },
      });
  }
}
