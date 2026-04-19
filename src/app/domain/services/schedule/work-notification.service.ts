// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, OnDestroy, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import { IWorkNotification } from 'src/app/domain/interfaces/work-notification.interface';
import { IShiftStatsNotification } from 'src/app/domain/interfaces/shift-stats-notification.interface';
import { IScheduleNotification } from 'src/app/domain/interfaces/schedule-notification.interface';
import { DataManagementScheduleService } from './data-management-schedule.service';
import { ShiftScheduleLoaderService } from './shift-schedule-loader.service';
import { AvailableShiftsCalculatorService } from './available-shifts-calculator.service';
import { AnalyseScenarioService } from './analyse-scenario.service';

@Injectable({
  providedIn: 'root',
})
export class WorkNotificationService implements OnDestroy {
  private signalRService = inject(SCHEDULE_SIGNALR);
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private shiftScheduleLoader = inject(ShiftScheduleLoaderService);
  private availableShiftsCalc = inject(AvailableShiftsCalculatorService);
  private analyseScenarioService = inject(AnalyseScenarioService);
  private destroyRef = inject(DestroyRef);

  private readonly REFRESH_DEBOUNCE_MS = 500;
  private _pendingRefreshes = new Map<string, { minDate: number; maxDate: number }>();
  private _refreshDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  public affectedShifts = signal<Map<string, boolean>>(new Map());
  public scheduleUpdateSignal = signal<string | null>(null);
  public shiftUpdateSignal = signal<string | null>(null);

  constructor() {
    this.subscribeToNotifications();
  }

  private subscribeToNotifications(): void {
    this.signalRService.workCreated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notification) => this.handleWorkNotification(notification));

    this.signalRService.workUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notification) => this.handleWorkNotification(notification));

    this.signalRService.workDeleted$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notification) => this.handleWorkNotification(notification));

    this.signalRService.scheduleUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notification) => this.handleScheduleNotification(notification));

    this.signalRService.shiftStatsUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notification) => this.handleShiftStatsNotification(notification));
  }

  private handleWorkNotification(notification: IWorkNotification): void {
    if ((notification.analyseToken ?? null) !== (this.analyseScenarioService.activeToken() ?? null)) {
      return;
    }

    console.log('Received work notification:', notification);

    const clientDisplayed = this.isClientDisplayed(notification.clientId);

    if (clientDisplayed) {
      this.queueRefresh(notification.clientId, new Date(notification.currentDate));
      this.scheduleUpdateSignal.set(notification.workId);
      setTimeout(() => this.scheduleUpdateSignal.set(null), 100);
    }

    this.markShiftAsAffected(notification.shiftId);
  }

  private queueRefresh(clientId: string, date: Date): void {
    const timestamp = date.getTime();
    const existing = this._pendingRefreshes.get(clientId);

    if (existing) {
      existing.minDate = Math.min(existing.minDate, timestamp);
      existing.maxDate = Math.max(existing.maxDate, timestamp);
    } else {
      this._pendingRefreshes.set(clientId, { minDate: timestamp, maxDate: timestamp });
    }

    if (this._refreshDebounceTimer) {
      clearTimeout(this._refreshDebounceTimer);
    }

    this._refreshDebounceTimer = setTimeout(() => {
      this.executeQueuedRefreshes();
    }, this.REFRESH_DEBOUNCE_MS);
  }

  private executeQueuedRefreshes(): void {
    if (this._pendingRefreshes.size === 0) return;

    console.log(`SignalR: Executing queued refreshes for ${this._pendingRefreshes.size} clients`);

    for (const [clientId, range] of this._pendingRefreshes) {
      const startDate = new Date(range.minDate);
      const endDate = new Date(range.maxDate);
      // Add +1 day buffer to cover overnight shifts that affect the next day
      const bufferedStart = new Date(startDate);
      bufferedStart.setDate(bufferedStart.getDate() - 1);
      const bufferedEnd = new Date(endDate);
      bufferedEnd.setDate(bufferedEnd.getDate() + 1);
      
      this.dataManagementSchedule.refreshClientScheduleForDateRange(clientId, bufferedStart, bufferedEnd);
    }

    this._pendingRefreshes.clear();
    this._refreshDebounceTimer = null;
  }

  private handleScheduleNotification(notification: IScheduleNotification): void {
    if ((notification.analyseToken ?? null) !== (this.analyseScenarioService.activeToken() ?? null)) {
      return;
    }

    console.log('Received schedule notification:', notification);

    const clientDisplayed = this.isClientDisplayed(notification.clientId);

    if (clientDisplayed) {
      // Wait for data to be loaded before triggering UI refresh
      this.refreshAffectedDays(notification.clientId, new Date(notification.currentDate))
        .then(() => {
          console.log(`[WorkNotification] Data refreshed for ${notification.clientId}, triggering UI update`);
          this.scheduleUpdateSignal.set(notification.clientId);
          setTimeout(() => this.scheduleUpdateSignal.set(null), 100);
        })
        .catch((err) => {
          console.error(`[WorkNotification] Failed to refresh data for ${notification.clientId}:`, err);
        });
    }
  }

  private handleShiftStatsNotification(notification: IShiftStatsNotification): void {
    if ((notification.analyseToken ?? null) !== (this.analyseScenarioService.activeToken() ?? null)) {
      return;
    }

    console.log('Received shift stats notification:', notification);

    const updated = this.shiftScheduleLoader.updateShiftEngaged(
      notification.shiftId,
      new Date(notification.date),
      notification.engaged
    );

    if (updated) {
      this.availableShiftsCalc.calculate(
        this.shiftScheduleLoader.shiftSchedules,
        this.dataManagementSchedule.currentFilter
      );

      this.shiftUpdateSignal.set(notification.shiftId);
      setTimeout(() => this.shiftUpdateSignal.set(null), 100);
    }
  }

  private isClientDisplayed(clientId: string): boolean {
    return this.dataManagementSchedule.clients.some((c) => c.id === clientId);
  }

  private refreshAffectedDays(clientId: string, centerDate: Date): Promise<void> {
    return this.dataManagementSchedule.refreshClientScheduleForDays(clientId, centerDate);
  }

  private markShiftAsAffected(shiftId: string): void {
    const currentMap = this.affectedShifts();
    const newMap = new Map(currentMap);
    newMap.set(shiftId, true);
    this.affectedShifts.set(newMap);

    this.shiftUpdateSignal.set(shiftId);
    setTimeout(() => this.shiftUpdateSignal.set(null), 100);
  }

  clearAffectedShifts(): void {
    this.affectedShifts.set(new Map());
  }

  isShiftAffected(shiftId: string): boolean {
    return this.affectedShifts().get(shiftId) ?? false;
  }

  ngOnDestroy(): void {
    this.affectedShifts.set(new Map());
  }
}
