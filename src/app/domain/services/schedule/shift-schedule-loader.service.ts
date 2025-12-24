import { inject, Injectable, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  IShiftSchedule,
  IShiftScheduleFilter,
  ShiftScheduleFilter,
} from 'src/app/domain/models/shift-schedule-class';
import { IWorkFilter } from 'src/app/domain/models/schedule-class';
import { DataShiftScheduleService } from 'src/app/infrastructure/api/data-shift-schedule.service';

@Injectable({
  providedIn: 'root',
})
export class ShiftScheduleLoaderService {
  private dataShiftSchedule = inject(DataShiftScheduleService);
  private destroyRef = inject(DestroyRef);

  private readonly INITIAL_CHUNK_SIZE = 200;
  private readonly LOAD_MORE_CHUNK_SIZE = 200;
  private _totalAvailableShifts = 0;
  private _currentChunkSize = 200;
  private _autoLoadEnabled = true;

  private _isLoadingMore = signal(false);
  private _isRead = signal(false);

  public shiftScheduleFilter: IShiftScheduleFilter = new ShiftScheduleFilter();
  public shiftSchedules: IShiftSchedule[] = [];

  get isLoadingMore(): boolean {
    return this._isLoadingMore();
  }

  get isRead() {
    return this._isRead;
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

  load(workFilter: IWorkFilter, holidayDates: Date[], onLoaded?: () => void): void {
    this.shiftScheduleFilter.dayVisibleBeforeMonth = workFilter.dayVisibleBeforeMonth;
    this.shiftScheduleFilter.dayVisibleAfterMonth = workFilter.dayVisibleAfterMonth;
    this.shiftScheduleFilter.currentMonth = workFilter.currentMonth;
    this.shiftScheduleFilter.currentYear = workFilter.currentYear;
    this.shiftScheduleFilter.holidayDates = holidayDates.length > 0 ? holidayDates : undefined;
    this.shiftScheduleFilter.selectedGroup = workFilter.selectedGroup || undefined;
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

          this._isRead.set(true);
          setTimeout(() => this._isRead.set(false), 100);

          onLoaded?.();

          if (this._autoLoadEnabled && this.hasMoreShifts) {
            setTimeout(() => this.autoLoadNextChunk(onLoaded), 100);
          }
        },
        error: (err) => {
          console.error('Error loading shift schedules:', err);
        },
      });
  }

  private autoLoadNextChunk(onLoaded?: () => void): void {
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
          this._isRead.set(true);
          setTimeout(() => this._isRead.set(false), 100);

          onLoaded?.();

          if (this._autoLoadEnabled && this.hasMoreShifts) {
            setTimeout(() => this.autoLoadNextChunk(onLoaded), 50);
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
      this._isRead.set(true);
      setTimeout(() => this._isRead.set(false), 100);
    }

    return updated;
  }
}
