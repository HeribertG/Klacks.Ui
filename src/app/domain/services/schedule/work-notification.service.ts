import { inject, Injectable, OnDestroy, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SignalRService } from 'src/app/infrastructure/signalr/signalr.service';
import { IWorkNotification } from 'src/app/domain/interfaces/work-notification.interface';
import { IShiftStatsNotification } from 'src/app/domain/interfaces/shift-stats-notification.interface';
import { IScheduleNotification } from 'src/app/domain/interfaces/schedule-notification.interface';
import { DataManagementScheduleService } from './data-management-schedule.service';
import { ShiftScheduleLoaderService } from './shift-schedule-loader.service';
import { AvailableShiftsCalculatorService } from './available-shifts-calculator.service';

@Injectable({
  providedIn: 'root',
})
export class WorkNotificationService implements OnDestroy {
  private signalRService = inject(SignalRService);
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private shiftScheduleLoader = inject(ShiftScheduleLoaderService);
  private availableShiftsCalc = inject(AvailableShiftsCalculatorService);
  private destroyRef = inject(DestroyRef);

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
    console.log('Received work notification:', notification);

    const clientDisplayed = this.isClientDisplayed(notification.clientId);

    if (clientDisplayed) {
      this.refreshAffectedDays(notification.clientId, new Date(notification.currentDate));
      this.scheduleUpdateSignal.set(notification.workId);
      setTimeout(() => this.scheduleUpdateSignal.set(null), 100);
    }

    this.markShiftAsAffected(notification.shiftId);
  }

  private handleScheduleNotification(notification: IScheduleNotification): void {
    console.log('Received schedule notification:', notification);

    const clientDisplayed = this.isClientDisplayed(notification.clientId);

    if (clientDisplayed) {
      this.refreshAffectedDays(notification.clientId, new Date(notification.currentDate));
      this.scheduleUpdateSignal.set(notification.clientId);
      setTimeout(() => this.scheduleUpdateSignal.set(null), 100);
    }
  }

  private handleShiftStatsNotification(notification: IShiftStatsNotification): void {
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

  private refreshAffectedDays(clientId: string, centerDate: Date): void {
    this.dataManagementSchedule.refreshClientScheduleForDays(clientId, centerDate);
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
