import { inject, Injectable, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  IClientWork,
  IWork,
  IWorkFilter,
  Work,
  WorkFilter,
} from 'src/app/domain/models/schedule-class';
import {
  IShiftSchedule,
  IShiftScheduleFilter,
  ShiftScheduleFilter,
} from 'src/app/domain/models/shift-schedule-class';
import {
  IWorkScheduleClient,
  IWorkScheduleEntry,
  IWorkScheduleFilter,
  WorkScheduleByClientAndDate,
  WorkScheduleByDate,
  WorkScheduleEntry,
  WorkScheduleEntryType,
} from 'src/app/domain/models/work-schedule-class';
import { DataScheduleService } from 'src/app/infrastructure/api/data-schedule.service';
import { DataShiftScheduleService } from 'src/app/infrastructure/api/data-shift-schedule.service';
import { DataWorkScheduleService } from 'src/app/infrastructure/api/data-work-schedule.service';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/shared/helpers/object.helper';
import { ILoadable } from 'src/app/domain/interfaces/manageable.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { RouteName } from 'src/app/domain/models/entity-names.enum';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { addDays } from 'src/app/shared/helpers/date.helper';

@Injectable({
  providedIn: 'root',
})
export class DataManagementScheduleService implements ILoadable {
  private dataSchedule = inject(DataScheduleService);
  private dataShiftSchedule = inject(DataShiftScheduleService);
  private dataWorkSchedule = inject(DataWorkScheduleService);
  private registry = inject(MANAGEABLE_SERVICE_REGISTRY_TOKEN);
  private destroyRef = inject(DestroyRef);
  private destroy$ = new Subject<void>();

  private readonly INITIAL_CHUNK_SIZE = 200;
  private readonly LOAD_MORE_CHUNK_SIZE = 200;
  private _totalAvailableShifts = 0;
  private _isLoadingMore = signal(false);
  private _currentChunkSize = 200;
  private _autoLoadEnabled = true;

  constructor() {
    this.registry.register(
      RouteName.SCHEDULE,
      DataManagementScheduleService
    );
  }

  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean { return this._showProgressSpinner(); }

  public isRead = signal(false);
  public isShiftScheduleRead = signal(false);
  public isUpdate = signal<IWork | undefined>(undefined);

  public workFilter: IWorkFilter = new WorkFilter();
  public get currentFilter(): IWorkFilter { return this.workFilter; }
  public shiftScheduleFilter: IShiftScheduleFilter = new ShiftScheduleFilter();
  public clients: IClientWork[] = [];
  public shiftSchedules: IShiftSchedule[] = [];
  public workScheduleEntries: IWorkScheduleEntry[] = [];
  public workScheduleByClientAndDate: WorkScheduleByClientAndDate = new Map();
  public holidayDates: Date[] = [];
  public isWorkScheduleRead = signal(false);
  private _restoreSearchSignal = signal('');
  public restoreSearch = { set: (value: string) => this._restoreSearchSignal.set(value) };
  public onExternalFilterChange?: () => void;

  private workFilterDummy: IWorkFilter | undefined = undefined;

  get isLoadingMore(): boolean {
    return this._isLoadingMore();
  }

  get hasMoreShifts(): boolean {
    const uniqueShiftIds = new Set(this.shiftSchedules.map(s => s.shiftId));
    return uniqueShiftIds.size < this._totalAvailableShifts;
  }

  get shiftLoadingProgress(): number {
    if (this._totalAvailableShifts === 0) return 0;
    const uniqueShiftIds = new Set(this.shiftSchedules.map(s => s.shiftId));
    return Math.round((uniqueShiftIds.size / this._totalAvailableShifts) * 100);
  }

  get totalAvailableShifts(): number {
    return this._totalAvailableShifts;
  }

  readDatas() {
    this._showProgressSpinner.set(true);
    this.readWorkSchedule();
    this.readShiftSchedule();
  }

  readShiftSchedule() {
    this.shiftSchedules = [];
    this.shiftScheduleFilter.dayVisibleBeforeMonth = this.workFilter.dayVisibleBeforeMonth;
    this.shiftScheduleFilter.dayVisibleAfterMonth = this.workFilter.dayVisibleAfterMonth;
    this.shiftScheduleFilter.currentMonth = this.workFilter.currentMonth;
    this.shiftScheduleFilter.currentYear = this.workFilter.currentYear;
    this.shiftScheduleFilter.holidayDates = this.holidayDates.length > 0 ? this.holidayDates : undefined;
    this.shiftScheduleFilter.selectedGroup = this.workFilter.selectedGroup || undefined;
    this.shiftScheduleFilter.startRow = 0;
    this.shiftScheduleFilter.rowCount = this.INITIAL_CHUNK_SIZE;
    this._currentChunkSize = this.LOAD_MORE_CHUNK_SIZE;
    this._autoLoadEnabled = true;

    this.dataShiftSchedule.getShiftSchedule(this.shiftScheduleFilter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.shiftSchedules = response.shifts;
          this._totalAvailableShifts = response.totalCount;

          this.isShiftScheduleRead.set(true);
          setTimeout(() => this.isShiftScheduleRead.set(false), 100);

          if (this._autoLoadEnabled && this.hasMoreShifts) {
            setTimeout(() => this.autoLoadNextChunk(), 100);
          }
        },
        error: (err) => {
          console.error('Error loading shift schedules:', err);
        },
      });
  }

  readWorkSchedule() {
    this.workScheduleEntries = [];
    this.workScheduleByClientAndDate = new Map();
    this.clients = [];

    const startDate = this.calculateStartDate();
    const endDate = this.calculateEndDate();

    const filter: IWorkScheduleFilter = {
      startDate: this.formatDateOnly(startDate),
      endDate: this.formatDateOnly(endDate),
      selectedGroup: this.workFilter.selectedGroup || undefined,
    };

    this.dataWorkSchedule.getWorkSchedule(filter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.workScheduleEntries = response.entries ?? [];
          this.workScheduleByClientAndDate = this.groupWorkScheduleByClientAndDate(this.workScheduleEntries);
          this.clients = this.convertToClientWork(response.clients ?? []);
          this.updateClientNeededRows();
          this.workFilterDummy = cloneObject<IWorkFilter>(this.workFilter);
          this._showProgressSpinner.set(false);
          this.isRead.set(true);
          setTimeout(() => this.isRead.set(false), 100);
          this.isWorkScheduleRead.set(true);
          setTimeout(() => this.isWorkScheduleRead.set(false), 100);
        },
        error: (err) => {
          console.error('Error loading work schedule:', err);
          this._showProgressSpinner.set(false);
        },
      });
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

  private updateClientNeededRows(): void {
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

  private groupWorkScheduleByClientAndDate(entries: IWorkScheduleEntry[]): WorkScheduleByClientAndDate {
    const result: WorkScheduleByClientAndDate = new Map();

    for (const entry of entries) {
      const clientId = entry.clientId;
      const dateKey = this.formatDateOnly(new Date(entry.entryDate));

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

  getWorkScheduleForClientAndDate(clientId: string, date: Date): IWorkScheduleEntry[] {
    const dateKey = this.formatDateOnly(date);
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

  private calculateStartDate(): Date {
    const year = this.workFilter.currentYear;
    const month = this.workFilter.currentMonth - 1;
    const daysBefore = this.workFilter.dayVisibleBeforeMonth;
    const firstOfMonth = new Date(year, month, 1);
    return new Date(firstOfMonth.getTime() - daysBefore * 24 * 60 * 60 * 1000);
  }

  private calculateEndDate(): Date {
    const year = this.workFilter.currentYear;
    const month = this.workFilter.currentMonth - 1;
    const daysAfter = this.workFilter.dayVisibleAfterMonth;
    const lastOfMonth = new Date(year, month + 1, 0);
    return new Date(lastOfMonth.getTime() + daysAfter * 24 * 60 * 60 * 1000);
  }

  private formatDateOnly(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private autoLoadNextChunk(): void {
    if (!this._autoLoadEnabled || !this.hasMoreShifts || this._isLoadingMore()) {
      return;
    }

    this._isLoadingMore.set(true);
    const uniqueShiftIds = new Set(this.shiftSchedules.map(s => s.shiftId));
    this.shiftScheduleFilter.startRow = uniqueShiftIds.size;
    this.shiftScheduleFilter.rowCount = this._currentChunkSize;

    this.dataShiftSchedule.getShiftSchedule(this.shiftScheduleFilter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.shiftSchedules.push(...response.shifts);

          const newUniqueCount = new Set(response.shifts.map(s => s.shiftId)).size;

          if (newUniqueCount < this._currentChunkSize) {
            this._totalAvailableShifts = new Set(this.shiftSchedules.map(s => s.shiftId)).size;
            this._autoLoadEnabled = false;
          } else {
            this._currentChunkSize = Math.min(this._currentChunkSize * 2, 400);
          }

          this._isLoadingMore.set(false);
          this.isShiftScheduleRead.set(true);
          setTimeout(() => this.isShiftScheduleRead.set(false), 100);

          if (this._autoLoadEnabled && this.hasMoreShifts) {
            setTimeout(() => this.autoLoadNextChunk(), 50);
          }
        },
        error: (err) => {
          console.error('Error auto-loading shift schedules:', err);
          this._isLoadingMore.set(false);
          this._autoLoadEnabled = false;
        },
      });
  }
  readData(index: number): IWork[] | undefined {
    if (index < this.clients.length) {
      const client = this.clients[index];
      if (client && client.works) {
        return client.works;
      }
    }
    return undefined;
  }
  get rows(): number {
    return this.clients.length;
  }

  addWork(index: number, value: IWork) {
    if (index < this.clients.length) {
      const client = this.clients[index];
      const tmp = value as Work;
      value.clientId = client.id!;
      delete tmp.id;
      this.dataSchedule.addWork(tmp).pipe(takeUntil(this.destroy$)).subscribe((x) => {
        client.works.push(x);
        client.works = this.sortWorks(client.works);
        this.isUpdate.set(x);
        setTimeout(() => this.isUpdate.set(undefined), 100);
      });
    }
  }

  deleteWork(index: number, value: IWork) {
    if (value.id) {
      this.dataSchedule.deleteWork(value.id!).pipe(takeUntil(this.destroy$)).subscribe(() => {
        const client = this.clients[index];
        client.works = this.sortWorks(
          client.works.filter((obj) => obj.id !== value.id)
        );
        this.isUpdate.set(value);
        setTimeout(() => this.isUpdate.set(undefined), 100);
      });
    }
  }

  readClientId(index: number): string | undefined {
    if (index < this.clients.length) {
      const client = this.clients[index];
      if (client) {
        return client.id;
      }
    }
    return undefined;
  }

  async updateWork(index: number, value: IWork) {
    return this.dataSchedule.updateWork(value as Work).pipe(takeUntil(this.destroy$)).subscribe(() => {
      const client = this.clients[index];
      client.works = this.sortWorks(client.works);
      this.isUpdate.set(value);
      setTimeout(() => this.isUpdate.set(undefined), 100);
    });
  }

  indexOfWork(value: IWork): number {
    const client = this.clients.find((x) => x.id === value.clientId);
    if (client) {
      return client.works.findIndex((x) => x.id === value.id);
    }
    return -1;
  }

  private sortWorks(value: IWork[]): IWork[] {
    return value.sort((a: IWork, b: IWork) => {
      const da = new Date(a.currentDate).getTime();
      const db = new Date(b.currentDate).getTime();

      return da < db ? -1 : da > db ? 1 : 0;
    });
  }

  private isFilter_Dirty(): boolean {
    const a = this.workFilter as IWorkFilter;
    const b = this.workFilterDummy as IWorkFilter;

    if (!compareComplexObjects(a, b)) {
      return true;
    }
    return false;
  }

  addWorkScheduleEntry(params: {
    clientId: string;
    date: Date;
    shiftId: string;
    workTime: number;
  }): void {
    const work = new Work();
    work.clientId = params.clientId;
    work.shiftId = params.shiftId;
    work.currentDate = params.date;
    work.workTime = params.workTime;
    work.isSealed = false;

    this.dataSchedule.addWork(work)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.refreshClientScheduleForDays(params.clientId, params.date);
        },
        error: (err) => {
          console.error('Error creating work entry:', err);
        },
      });
  }

  private refreshClientScheduleForDays(clientId: string, centerDate: Date): void {
    const startDate = addDays(centerDate, -1);
    const endDate = addDays(centerDate, 1);

    const filter: IWorkScheduleFilter = {
      startDate: this.formatDateOnly(startDate),
      endDate: this.formatDateOnly(endDate),
    };

    this.dataWorkSchedule.getWorkSchedule(filter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const clientEntries = response.entries.filter(e => e.clientId === clientId);
          this.replaceClientEntriesForDays(clientId, startDate, endDate, clientEntries);
          this.updateClientNeededRows();

          this.isRead.set(true);
          setTimeout(() => this.isRead.set(false), 100);
        },
        error: (err) => {
          console.error('Error refreshing schedule:', err);
        },
      });
  }

  private replaceClientEntriesForDays(
    clientId: string,
    startDate: Date,
    endDate: Date,
    newEntries: IWorkScheduleEntry[]
  ): void {
    const dateKeys = this.getDateKeysBetween(startDate, endDate);

    this.workScheduleEntries = this.workScheduleEntries.filter(entry => {
      if (entry.clientId !== clientId) return true;
      const entryDateKey = this.formatDateOnly(new Date(entry.entryDate));
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

      const dateKey = this.formatDateOnly(new Date(entry.entryDate));
      if (!this.workScheduleByClientAndDate.has(clientId)) {
        this.workScheduleByClientAndDate.set(clientId, new Map());
      }
      const map = this.workScheduleByClientAndDate.get(clientId)!;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(entry);
    }
  }

  private getDateKeysBetween(startDate: Date, endDate: Date): string[] {
    const keys: string[] = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      keys.push(this.formatDateOnly(current));
      current = addDays(current, 1);
    }
    return keys;
  }

  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
