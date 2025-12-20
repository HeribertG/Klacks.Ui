import { inject, Injectable, OnDestroy, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SignalRService } from 'src/app/infrastructure/signalr/signalr.service';
import { IWorkNotification } from 'src/app/domain/interfaces/work-notification.interface';
import { DataManagementScheduleService } from './data-management-schedule.service';

@Injectable({
  providedIn: 'root',
})
export class WorkNotificationService implements OnDestroy {
  private signalRService = inject(SignalRService);
  private dataManagementSchedule = inject(DataManagementScheduleService);
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
  }

  private handleWorkNotification(notification: IWorkNotification): void {
    console.log('Received work notification:', notification);

    const clientDisplayed = this.isClientDisplayed(notification.clientId);

    if (clientDisplayed) {
      this.refreshAffectedDays(notification.clientId, new Date(notification.currentDate));
      this.scheduleUpdateSignal.set(notification.workId);
      setTimeout(() => this.scheduleUpdateSignal.set(null), 100);
    }

    this.dataManagementSchedule.readShiftSchedule();
    this.markShiftAsAffected(notification.shiftId);
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
