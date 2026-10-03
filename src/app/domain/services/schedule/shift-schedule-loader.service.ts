// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Service for loading shift schedule data with automatic chunk loading.
 * Delegates the chunk-loading mechanics (load-id guard, exponential
 * chunk-size, auto-load recursion, one-shot onLoaded) to ChunkLoader,
 * so this file only contains shift-domain logic.
 *
 * @param shiftSchedules - Array of all loaded shift-date assignments
 * @param shiftScheduleFilter - Current filter for the shift schedule query
 * @param shiftIds - Shifts whose sporadic booking state is re-read from the backend after a write
 */

import { inject, Injectable, signal, DestroyRef } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  IShiftSchedule,
  IShiftScheduleFilter,
  ShiftScheduleFilter,
} from 'src/app/domain/models/schedule/shift-schedule-class';
import { IWorkFilter } from 'src/app/domain/models/schedule/schedule-class';
import { DataShiftScheduleService } from 'src/app/infrastructure/api/schedule/data-shift-schedule.service';
import { AnalyseScenarioService } from './analyse-scenario.service';
import { AvailableShiftsCalculatorService } from './available-shifts-calculator.service';
import { ChunkLoader } from './chunk-loader';
import { isSameCalendarDate } from 'src/app/shared/helpers/calendar-date.helper';

interface ShiftScheduleResponse {
  shifts: IShiftSchedule[];
  totalCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class ShiftScheduleLoaderService {
  private dataShiftSchedule = inject(DataShiftScheduleService);
  private destroyRef = inject(DestroyRef);
  private analyseScenarioService = inject(AnalyseScenarioService);
  private availableShiftsCalc = inject(AvailableShiftsCalculatorService);

  private readonly INITIAL_CHUNK_SIZE = 200;
  private readonly LOAD_MORE_CHUNK_SIZE = 200;
  private readonly MAX_CHUNK_SIZE = 400;

  private _totalAvailableShifts = 0;
  private _isRead = signal(0);
  private _activeWorkFilter: IWorkFilter | undefined;

  private readonly chunkLoader = new ChunkLoader<IShiftScheduleFilter, ShiftScheduleResponse>({
    destroyRef: this.destroyRef,
    initialChunkSize: this.LOAD_MORE_CHUNK_SIZE,
    maxChunkSize: this.MAX_CHUNK_SIZE,
    fetch: (filter) => this.dataShiftSchedule.getShiftSchedule(filter),
    onInitialResponse: (response) => {
      this.shiftSchedules = response.shifts;
      this._totalAvailableShifts = response.totalCount;
      this._isRead.update((v) => v + 1);
    },
    onChunkResponse: (response, chunkSize) => {
      this.shiftSchedules.push(...response.shifts);
      const newUniqueCount = new Set(response.shifts.map((s) => s.shiftId)).size;
      if (newUniqueCount < chunkSize) {
        this._totalAvailableShifts = this.uniqueShiftCount();
      }
      if (this._activeWorkFilter) {
        this.availableShiftsCalc.calculate(
          this.shiftSchedules,
          this._activeWorkFilter,
        );
      }
      this._isRead.update((v) => v + 1);
    },
    hasMore: () => this.uniqueShiftCount() < this._totalAvailableShifts,
    nextChunkFilter: (chunkSize) => ({
      ...this.shiftScheduleFilter,
      startRow: this.uniqueShiftCount(),
      rowCount: chunkSize,
    }),
  });

  public shiftScheduleFilter: IShiftScheduleFilter = new ShiftScheduleFilter();
  public shiftSchedules: IShiftSchedule[] = [];

  get isLoadingMore(): boolean {
    return this.chunkLoader.isLoadingMore();
  }

  get isRead() {
    return this._isRead;
  }

  get hasMoreShifts(): boolean {
    return this.uniqueShiftCount() < this._totalAvailableShifts;
  }

  get isInitialPending(): boolean {
    return this.chunkLoader.isInitialPending();
  }

  get isInitialFailed(): boolean {
    return this.chunkLoader.isInitialFailed();
  }

  get isAutoLoadEnabled(): boolean {
    return this.chunkLoader.isAutoLoadEnabled;
  }

  get shiftLoadingProgress(): number {
    if (this._totalAvailableShifts === 0) return 0;
    return Math.round((this.uniqueShiftCount() / this._totalAvailableShifts) * 100);
  }

  get totalAvailableShifts(): number {
    return this._totalAvailableShifts;
  }

  load(
    startDate: string,
    endDate: string,
    workFilter: IWorkFilter,
    holidayDates: Date[],
    onLoaded?: () => void,
  ): void {
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

    this._activeWorkFilter = workFilter;

    this.chunkLoader.load({ ...this.shiftScheduleFilter }, onLoaded);
  }

  updateShiftEngaged(shiftId: string, date: Date, engaged: number): boolean {
    let updated = false;
    for (const shift of this.shiftSchedules) {
      if (shift.shiftId !== shiftId) continue;

      if (isSameCalendarDate(shift.date, date)) {
        shift.engaged = engaged;
        updated = true;
      }
    }

    if (updated) {
      this._isRead.update((v) => v + 1);
    }

    return updated;
  }

  async refreshSporadicShifts(shiftIds: readonly string[]): Promise<void> {
    const wanted = new Set(shiftIds);
    const shiftDatePairs = this.shiftSchedules
      .filter((shift) => shift.isSporadic && wanted.has(shift.shiftId))
      .map((shift) => ({ shiftId: shift.shiftId, date: shift.date }));

    if (shiftDatePairs.length === 0) {
      return;
    }

    try {
      const response = await firstValueFrom(
        this.dataShiftSchedule.getShiftSchedulePartial({
          shiftDatePairs,
          analyseToken: this.analyseScenarioService.activeToken() ?? undefined,
        }),
      );
      this.applySporadicState(response.shifts);
    } catch (error) {
      console.error('Failed to reload the sporadic shift state:', error);
    }
  }

  private applySporadicState(fresh: IShiftSchedule[]): void {
    for (const update of fresh) {
      for (const shift of this.shiftSchedules) {
        if (shift.shiftId === update.shiftId && isSameCalendarDate(shift.date, update.date)) {
          shift.engaged = update.engaged;
          shift.sporadicStatus = update.sporadicStatus;
          shift.periodBookedDays = update.periodBookedDays;
        }
      }
    }

    if (this._activeWorkFilter) {
      this.availableShiftsCalc.calculate(this.shiftSchedules, this._activeWorkFilter);
    }
    this._isRead.update((v) => v + 1);
  }

  private uniqueShiftCount(): number {
    return new Set(this.shiftSchedules.map((s) => s.shiftId)).size;
  }
}
