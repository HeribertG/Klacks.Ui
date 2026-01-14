import { inject, Injectable, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  IClientWork,
  IWorkFilter,
} from 'src/app/domain/models/schedule-class';
import {
  IPeriodHours,
  IWorkScheduleClient,
  IScheduleCell,
  IWorkScheduleFilter,
  WorkScheduleByClientAndDate,
} from 'src/app/domain/models/work-schedule-class';
import { DataWorkScheduleService } from 'src/app/infrastructure/api/data-work-schedule.service';
import { formatDateOnly, getDateKeysBetween } from 'src/app/shared/helpers/date.helper';

@Injectable({
  providedIn: 'root',
})
export class WorkScheduleLoaderService {
  private dataWorkSchedule = inject(DataWorkScheduleService);
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
    return Math.round((this.clients.length / this._totalAvailableClients) * 100);
  }

  get totalAvailableClients(): number {
    return this._totalAvailableClients;
  }

  load(workFilter: IWorkFilter, onLoaded?: () => void): void {
    this._currentLoadId++;
    const loadId = this._currentLoadId;

    this.workScheduleEntries = [];
    this.workScheduleByClientAndDate = new Map();
    this.clients = [];
    this.periodHours = new Map();
    this._autoLoadEnabled = true;
    this._currentChunkSize = this.LOAD_MORE_CHUNK_SIZE;
    this._isLoadingMore.set(false);

    const startDate = this.calculateStartDate(workFilter);
    const endDate = this.calculateEndDate(workFilter);

    this._currentFilter = {
      startDate: formatDateOnly(startDate),
      endDate: formatDateOnly(endDate),
      selectedGroup: workFilter.selectedGroup || undefined,
      orderBy: workFilter.orderBy || 'name',
      sortOrder: workFilter.sortOrder || 'asc',
      showEmployees: workFilter.showEmployees ?? true,
      showExtern: workFilter.showExtern ?? true,
      hoursSortOrder: workFilter.hoursSortOrder || undefined,
      startRow: 0,
      rowCount: this.INITIAL_CHUNK_SIZE,
    };

    this.dataWorkSchedule.getWorkSchedule(this._currentFilter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (loadId !== this._currentLoadId) return;

          this.workScheduleEntries = response.entries ?? [];
          this.workScheduleByClientAndDate = this.groupByClientAndDate(this.workScheduleEntries);
          this.clients = this.convertToClientWork(response.clients ?? []);
          this.periodHours = new Map(Object.entries(response.periodHours ?? {}));
          this._totalAvailableClients = response.totalClientCount;
          this.updateClientNeededRows();

          this._isRead.set(true);
          setTimeout(() => this._isRead.set(false), 100);

          onLoaded?.();

          if (this._autoLoadEnabled && this.hasMoreClients) {
            setTimeout(() => this.autoLoadNextChunk(loadId, onLoaded), 100);
          }
        },
        error: (err) => {
          console.error('Error loading work schedule:', err);
        },
      });
  }

  private autoLoadNextChunk(loadId: number, onLoaded?: () => void): void {
    if (loadId !== this._currentLoadId) return;
    if (!this._autoLoadEnabled || !this.hasMoreClients || this._isLoadingMore() || !this._currentFilter) {
      return;
    }

    this._isLoadingMore.set(true);
    this._currentFilter.startRow = this.clients.length;
    this._currentFilter.rowCount = this._currentChunkSize;

    this.dataWorkSchedule.getWorkSchedule(this._currentFilter)
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

          for (const [key, value] of Object.entries(response.periodHours ?? {})) {
            this.periodHours.set(key, value);
          }

          this.updateClientNeededRows();

          if (newClients.length < this._currentChunkSize) {
            this._totalAvailableClients = this.clients.length;
            this._autoLoadEnabled = false;
          } else {
            this._currentChunkSize = Math.min(this._currentChunkSize * 2, 100);
          }

          this._isLoadingMore.set(false);
          this._isRead.set(true);
          setTimeout(() => this._isRead.set(false), 100);

          onLoaded?.();

          if (this._autoLoadEnabled && this.hasMoreClients) {
            setTimeout(() => this.autoLoadNextChunk(loadId, onLoaded), 50);
          }
        },
        error: (err) => {
          console.error('Error auto-loading work schedule:', err);
          this._isLoadingMore.set(false);
          this._autoLoadEnabled = false;
        },
      });
  }

  getWorkScheduleForClientAndDate(clientId: string, date: Date): IScheduleCell[] {
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
      const lengths = Array.from(dateMap.values(), entries => entries.length);
      result.set(clientId, Math.max(0, ...lengths));
    }

    return result;
  }

  private calculateStartDate(filter: IWorkFilter): Date {
    const year = filter.currentYear;
    const month = filter.currentMonth - 1;
    const daysBefore = filter.dayVisibleBeforeMonth;
    const firstOfMonth = new Date(year, month, 1);
    return new Date(firstOfMonth.getTime() - daysBefore * 24 * 60 * 60 * 1000);
  }

  private calculateEndDate(filter: IWorkFilter): Date {
    const year = filter.currentYear;
    const month = filter.currentMonth - 1;
    const daysAfter = filter.dayVisibleAfterMonth;
    const lastOfMonth = new Date(year, month + 1, 0);
    return new Date(lastOfMonth.getTime() + daysAfter * 24 * 60 * 60 * 1000);
  }

  private convertToClientWork(clients: IWorkScheduleClient[]): IClientWork[] {
    return clients.map(c => ({
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
      works: [],
    }));
  }

  public updateClientNeededRows(): void {
    const maxEntriesMap = this.getMaxEntriesPerClientAndDate();
    const MIN_ROWS = 2;

    for (const client of this.clients) {
      if (client.id) {
        const maxEntries = (maxEntriesMap.get(client.id) || 0) + 1;
        client.neededRows = Math.max(MIN_ROWS, maxEntries);
      } else {
        client.neededRows = MIN_ROWS;
      }
    }
  }

  private groupByClientAndDate(entries: IScheduleCell[]): WorkScheduleByClientAndDate {
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
    newEntries: IScheduleCell[]
  ): void {
    const dateKeys = getDateKeysBetween(startDate, endDate);

    this.workScheduleEntries = this.workScheduleEntries.filter(entry => {
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
}
