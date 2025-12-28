import { inject, Injectable, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  IClientWork,
  IWorkFilter,
} from 'src/app/domain/models/schedule-class';
import {
  IMonthlyHours,
  IWorkScheduleClient,
  IWorkScheduleEntry,
  IWorkScheduleFilter,
  WorkScheduleByClientAndDate,
} from 'src/app/domain/models/work-schedule-class';
import { DataWorkScheduleService } from 'src/app/infrastructure/api/data-work-schedule.service';
import { formatDateOnly } from 'src/app/shared/helpers/date.helper';

@Injectable({
  providedIn: 'root',
})
export class WorkScheduleLoaderService {
  private dataWorkSchedule = inject(DataWorkScheduleService);
  private destroyRef = inject(DestroyRef);

  private _isRead = signal(false);

  public workScheduleEntries: IWorkScheduleEntry[] = [];
  public workScheduleByClientAndDate: WorkScheduleByClientAndDate = new Map();
  public clients: IClientWork[] = [];
  public monthlyHours = new Map<string, IMonthlyHours>();

  get isRead() {
    return this._isRead;
  }

  load(workFilter: IWorkFilter, onLoaded?: () => void): void {
    this.workScheduleEntries = [];
    this.workScheduleByClientAndDate = new Map();
    this.clients = [];
    this.monthlyHours = new Map();

    const startDate = this.calculateStartDate(workFilter);
    const endDate = this.calculateEndDate(workFilter);

    const filter: IWorkScheduleFilter = {
      startDate: formatDateOnly(startDate),
      endDate: formatDateOnly(endDate),
      selectedGroup: workFilter.selectedGroup || undefined,
      orderBy: workFilter.orderBy || 'name',
      sortOrder: workFilter.sortOrder || 'asc',
      showEmployees: workFilter.showEmployees ?? true,
      showExtern: workFilter.showExtern ?? true,
      hoursSortOrder: workFilter.hoursSortOrder || undefined,
    };

    this.dataWorkSchedule.getWorkSchedule(filter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.workScheduleEntries = response.entries ?? [];
          this.workScheduleByClientAndDate = this.groupByClientAndDate(this.workScheduleEntries);
          this.clients = this.convertToClientWork(response.clients ?? []);
          this.monthlyHours = new Map(Object.entries(response.monthlyHours ?? {}));
          this.updateClientNeededRows();

          this._isRead.set(true);
          setTimeout(() => this._isRead.set(false), 100);

          onLoaded?.();
        },
        error: (err) => {
          console.error('Error loading work schedule:', err);
        },
      });
  }

  getWorkScheduleForClientAndDate(clientId: string, date: Date): IWorkScheduleEntry[] {
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

  private groupByClientAndDate(entries: IWorkScheduleEntry[]): WorkScheduleByClientAndDate {
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

  replaceClientEntriesForDays(
    clientId: string,
    startDate: Date,
    endDate: Date,
    newEntries: IWorkScheduleEntry[]
  ): void {
    const dateKeys = this.getDateKeysBetween(startDate, endDate);

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

  private getDateKeysBetween(startDate: Date, endDate: Date): string[] {
    const keys: string[] = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      keys.push(formatDateOnly(current));
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    }
    return keys;
  }
}
