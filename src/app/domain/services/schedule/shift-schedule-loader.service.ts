// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for loading shift schedule data with automatic chunk loading.
 * Delegates the chunk-loading mechanics (load-id guard, exponential
 * chunk-size, auto-load recursion, one-shot onLoaded) to ChunkLoader,
 * so this file only contains shift-domain logic.
 *
 * @param shiftSchedules - Array of all loaded shift-date assignments
 * @param shiftScheduleFilter - Current filter for the shift schedule query
 */

import { inject, Injectable, signal, DestroyRef } from '@angular/core';
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
      this._isRead.update((v) => v + 1);
    }

    return updated;
  }

  private uniqueShiftCount(): number {
    return new Set(this.shiftSchedules.map((s) => s.shiftId)).size;
  }
}
