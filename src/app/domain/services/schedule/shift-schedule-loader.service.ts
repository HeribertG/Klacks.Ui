// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for loading shift schedule data with automatic chunk loading.
 * Uses Subject + switchMap to cleanly cancel the previous request on repeated load() calls.
 * @param shiftSchedules - Array of all loaded shift-date assignments
 * @param shiftScheduleFilter - Current filter for the shift schedule query
 */

import { inject, Injectable, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, switchMap, EMPTY, catchError } from 'rxjs';
import {
  IShiftSchedule,
  IShiftScheduleFilter,
  ShiftScheduleFilter,
} from 'src/app/domain/models/schedule/shift-schedule-class';
import { IWorkFilter } from 'src/app/domain/models/schedule/schedule-class';
import { DataShiftScheduleService } from 'src/app/infrastructure/api/schedule/data-shift-schedule.service';
import { AnalyseScenarioService } from './analyse-scenario.service';

interface ShiftLoadRequest {
  filter: IShiftScheduleFilter;
  onLoaded?: () => void;
}

@Injectable({
  providedIn: 'root',
})
export class ShiftScheduleLoaderService {
  private dataShiftSchedule = inject(DataShiftScheduleService);
  private destroyRef = inject(DestroyRef);
  private analyseScenarioService = inject(AnalyseScenarioService);

  private readonly INITIAL_CHUNK_SIZE = 200;
  private readonly LOAD_MORE_CHUNK_SIZE = 200;
  private _totalAvailableShifts = 0;
  private _currentChunkSize = 200;
  private _autoLoadEnabled = true;
  private _currentLoadId = 0;

  private _isLoadingMore = signal(false);
  private _isRead = signal(0);

  private loadTrigger$ = new Subject<ShiftLoadRequest>();

  public shiftScheduleFilter: IShiftScheduleFilter = new ShiftScheduleFilter();
  public shiftSchedules: IShiftSchedule[] = [];

  constructor() {
    this.setupLoadPipeline();
  }

  get isLoadingMore(): boolean {
    return this._isLoadingMore();
  }

  get isRead() {
    return this._isRead;
  }

  get hasMoreShifts(): boolean {
    const uniqueShiftIds = new Set(this.shiftSchedules.map((s) => s.shiftId));
    return uniqueShiftIds.size < this._totalAvailableShifts;
  }

  get shiftLoadingProgress(): number {
    if (this._totalAvailableShifts === 0) return 0;
    const uniqueShiftIds = new Set(this.shiftSchedules.map((s) => s.shiftId));
    return Math.round((uniqueShiftIds.size / this._totalAvailableShifts) * 100);
  }

  get totalAvailableShifts(): number {
    return this._totalAvailableShifts;
  }

  private setupLoadPipeline(): void {
    this.loadTrigger$
      .pipe(
        switchMap((request) => {
          return this.dataShiftSchedule.getShiftSchedule(request.filter).pipe(
            catchError((err) => {
              console.error('Error loading shift schedules:', err);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        this.shiftSchedules = response.shifts;
        this._totalAvailableShifts = response.totalCount;

        this._isRead.update(v => v + 1);

        this._pendingOnLoaded?.();

        if (this._autoLoadEnabled && this.hasMoreShifts) {
          const loadId = this._currentLoadId;
          setTimeout(() => this.autoLoadNextChunk(loadId), 100);
        }
      });
  }

  private _pendingOnLoaded?: () => void;

  load(
    startDate: string,
    endDate: string,
    workFilter: IWorkFilter,
    holidayDates: Date[],
    onLoaded?: () => void,
  ): void {
    this._currentLoadId++;
    this._isLoadingMore.set(false);
    this._pendingOnLoaded = onLoaded;

    this.shiftScheduleFilter.startDate = startDate;
    this.shiftScheduleFilter.endDate = endDate;
    this.shiftScheduleFilter.holidayDates =
      holidayDates.length > 0 ? holidayDates : undefined;
    this.shiftScheduleFilter.selectedGroup =
      workFilter.selectedGroup || undefined;
    this.shiftScheduleFilter.startRow = 0;
    this.shiftScheduleFilter.rowCount = this.INITIAL_CHUNK_SIZE;
    this.shiftScheduleFilter.analyseToken =
      this.analyseScenarioService.activeToken() ?? undefined;
    this._currentChunkSize = this.LOAD_MORE_CHUNK_SIZE;
    this._autoLoadEnabled = true;

    this.loadTrigger$.next({
      filter: { ...this.shiftScheduleFilter },
      onLoaded,
    });
  }

  private autoLoadNextChunk(loadId: number): void {
    if (loadId !== this._currentLoadId) return;
    if (
      !this._autoLoadEnabled ||
      !this.hasMoreShifts ||
      this._isLoadingMore()
    ) {
      return;
    }

    this._isLoadingMore.set(true);
    const uniqueShiftIds = new Set(this.shiftSchedules.map((s) => s.shiftId));
    this.shiftScheduleFilter.startRow = uniqueShiftIds.size;
    this.shiftScheduleFilter.rowCount = this._currentChunkSize;

    this.dataShiftSchedule
      .getShiftSchedule(this.shiftScheduleFilter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (loadId !== this._currentLoadId) {
            this._isLoadingMore.set(false);
            return;
          }

          this.shiftSchedules.push(...response.shifts);

          const newUniqueCount = new Set(response.shifts.map((s) => s.shiftId))
            .size;

          if (newUniqueCount < this._currentChunkSize) {
            this._totalAvailableShifts = new Set(
              this.shiftSchedules.map((s) => s.shiftId),
            ).size;
            this._autoLoadEnabled = false;
          } else {
            this._currentChunkSize = Math.min(this._currentChunkSize * 2, 400);
          }

          this._isLoadingMore.set(false);
          this._isRead.update(v => v + 1);

          this._pendingOnLoaded?.();

          if (this._autoLoadEnabled && this.hasMoreShifts) {
            setTimeout(() => this.autoLoadNextChunk(loadId), 50);
          }
        },
        error: (err) => {
          console.error('Error auto-loading shift schedules:', err);
          this._isLoadingMore.set(false);
          this._autoLoadEnabled = false;
        },
      });
  }

  updateShiftEngaged(shiftId: string, date: Date, engaged: number): boolean {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    let updated = false;
    for (const shift of this.shiftSchedules) {
      if (shift.shiftId !== shiftId) continue;

      const shiftDate = new Date(shift.date);
      shiftDate.setHours(0, 0, 0, 0);

      if (shiftDate.getTime() === normalizedDate.getTime()) {
        shift.engaged = engaged;
        updated = true;
      }
    }

    if (updated) {
      this._isRead.update(v => v + 1);
    }

    return updated;
  }
}
