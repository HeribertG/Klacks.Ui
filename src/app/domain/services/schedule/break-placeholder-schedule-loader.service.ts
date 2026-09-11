// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, signal, DestroyRef } from '@angular/core';
import { Subject, switchMap, EMPTY, catchError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IClientBreak } from 'src/app/domain/models/client/client-class';
import { IBreakFilter, IBreakPlaceholder } from 'src/app/domain/models/break/break-class';
import { IWorkFilter } from 'src/app/domain/models/schedule/schedule-class';
import { DataBreakPlaceholderService } from 'src/app/infrastructure/api/break/data-break-placeholder.service';
import { addDays, formatDateOnly } from 'src/app/shared/helpers/date.helper';
import { parseCalendarDate } from 'src/app/shared/helpers/calendar-date.helper';
import { resetSignalAfterDelay } from 'src/app/shared/helpers/signal-pulse.helper';

@Injectable({
  providedIn: 'root',
})
export class BreakPlaceholderScheduleLoaderService {
  private dataBreakPlaceholder = inject(DataBreakPlaceholderService);
  private destroyRef = inject(DestroyRef);

  private _isLoaded = signal(false);
  private loadTrigger$ = new Subject<IBreakFilter>();

  public visible = false;
  public clients: IClientBreak[] = [];

  constructor() {
    this.setupLoadPipeline();
  }

  get isLoaded() {
    return this._isLoaded;
  }

  private setupLoadPipeline(): void {
    this.loadTrigger$
      .pipe(
        switchMap((filter) => {
          return this.dataBreakPlaceholder.getScheduleList(filter).pipe(
            catchError((err) => {
              console.error('Error loading break placeholders for schedule:', err);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((clients) => {
        this.clients = clients;
        this._isLoaded.set(true);
        resetSignalAfterDelay(this._isLoaded);
      });
  }

  load(startDate: string, endDate: string, workFilter: IWorkFilter): void {
    const filter: IBreakFilter = {
      startDate,
      endDate,
      currentYear: 0,
      absences: [],
      selectedGroup: workFilter.selectedGroup || undefined,
      orderBy: workFilter.orderBy || 'name',
      sortOrder: workFilter.sortOrder || 'asc',
      searchString: '',
      numberOfItemsPerPage: 0,
      requiredPage: 0,
      numberOfItemOnPreviousPage: undefined,
      firstItemOnLastPage: undefined,
      isPreviousPage: undefined,
      isNextPage: undefined,
      showEmployees: workFilter.showEmployees ?? true,
      showExtern: workFilter.showExtern ?? true,
      individualSort: workFilter.individualSort ?? false,
    };

    this.loadTrigger$.next(filter);
  }

  removeBreakPlaceholder(id: string): void {
    for (const client of this.clients) {
      if (client.breakPlaceholders) {
        client.breakPlaceholders = client.breakPlaceholders.filter(bp => bp.id !== id);
      }
    }
  }

  getBreakPlaceholdersForClient(clientId: string): IBreakPlaceholder[] {
    const client = this.clients.find((c) => c.id === clientId);
    return client?.breakPlaceholders ?? [];
  }

  getMaxBreakPlaceholdersPerClientAndDay(
    startDate: string,
    endDate: string,
  ): Map<string, number> {
    const result = new Map<string, number>();
    const start = parseCalendarDate(startDate);
    const end = parseCalendarDate(endDate);
    if (!start || !end) return result;

    for (const client of this.clients) {
      if (!client.id || !client.breakPlaceholders?.length) continue;

      const dayCounts = new Map<string, number>();

      for (const bp of client.breakPlaceholders) {
        const bpFrom = parseCalendarDate(bp.from);
        const bpUntil = parseCalendarDate(bp.until);
        if (!bpFrom || !bpUntil) continue;

        const rangeStart = bpFrom < start ? start : bpFrom;
        const rangeEnd = bpUntil > end ? end : bpUntil;

        for (let current = rangeStart; current <= rangeEnd; current = addDays(current, 1)) {
          const key = formatDateOnly(current);
          dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
        }
      }

      if (dayCounts.size > 0) {
        const maxCount = Math.max(...dayCounts.values());
        result.set(client.id, maxCount);
      }
    }

    return result;
  }
}
