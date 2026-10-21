// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Period-hours recalculation from the schedule header: the normal run resets its busy flag when the request
 * returns, the thorough run (after confirmation) keeps it until the matching SignalR completion arrives.
 * @param destroyRef - Lifetime of the header component that ends the completion subscription
 */
import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import { IThoroughRecalculationCompletedNotification } from 'src/app/domain/interfaces/thorough-recalculation-completed-notification.interface';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { PeriodHoursRecalculationService } from 'src/app/domain/services/schedule/period-hours-recalculation.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { ModalType } from 'src/app/presentation/modal/modal-type.enum';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { TOAST_ICONS } from 'src/app/presentation/toast/toast-icons.constants';
import {
  SCHEDULE_HEADER_RECALCULATE_THOROUGH_TOAST,
  SCHEDULE_HEADER_RECALCULATE_TOAST,
} from '../schedule-header.constants';

@Injectable()
export class ScheduleHeaderRecalculationService {
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private analyseScenarioService = inject(AnalyseScenarioService);
  private periodHoursRecalculation = inject(PeriodHoursRecalculationService);
  private scheduleSignalR = inject(SCHEDULE_SIGNALR);
  private modalService = inject(ModalService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);

  readonly isRecalculating = signal(false);

  connect(destroyRef: DestroyRef): void {
    this.scheduleSignalR.thoroughRecalculationCompleted$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((notification) => this.onThoroughRecalculationCompleted(notification));
  }

  onThoroughRecalculateClick(): void {
    if (this.isRecalculating()) return;

    this.modalService.openModal({
      type: ModalType.Confirmation,
      title: this.translateService.instant('schedule.recalculate.thorough.title'),
      message: this.translateService.instant('schedule.recalculate.thorough.warning'),
      confirmText: this.translateService.instant('schedule.recalculate.thorough.start'),
      cancelText: this.translateService.instant('cancel'),
      onConfirm: () => this.onThoroughRecalculateConfirmed(),
    });
  }

  async onThoroughRecalculateConfirmed(): Promise<void> {
    if (this.isRecalculating()) return;

    const startDate = this.dataManagementSchedule.periodStartDate;
    const endDate = this.dataManagementSchedule.periodEndDate;
    if (!startDate || !endDate) return;

    this.isRecalculating.set(true);

    try {
      await this.periodHoursRecalculation.recalculateThorough(startDate, endDate);

      this.toastShowService.showInfo(
        this.translateService.instant('schedule.recalculate.thorough.started'),
        SCHEDULE_HEADER_RECALCULATE_THOROUGH_TOAST,
        '',
        TOAST_ICONS.INFO,
      );
    } catch {
      this.isRecalculating.set(false);
      this.toastShowService.showError(
        this.translateService.instant('schedule.recalculate.thorough.error'),
        SCHEDULE_HEADER_RECALCULATE_THOROUGH_TOAST,
      );
    }
  }

  async onRecalculatePeriodHours(): Promise<void> {
    if (this.isRecalculating()) return;

    const startDate = this.dataManagementSchedule.periodStartDate;
    const endDate = this.dataManagementSchedule.periodEndDate;
    if (!startDate || !endDate) return;

    this.isRecalculating.set(true);

    try {
      await this.periodHoursRecalculation.recalculate(startDate, endDate);

      this.toastShowService.showInfo(
        this.translateService.instant('schedule.recalculate.success'),
        SCHEDULE_HEADER_RECALCULATE_TOAST,
        '',
        TOAST_ICONS.INFO,
      );
    } catch {
      this.toastShowService.showError(
        this.translateService.instant('schedule.recalculate.error'),
        SCHEDULE_HEADER_RECALCULATE_TOAST,
      );
    } finally {
      this.isRecalculating.set(false);
    }
  }

  private onThoroughRecalculationCompleted(notification: IThoroughRecalculationCompletedNotification): void {
    const activeToken = this.analyseScenarioService.activeToken() ?? null;
    if ((notification.analyseToken ?? null) !== activeToken) return;

    this.isRecalculating.set(false);
    this.toastShowService.showInfo(
      this.translateService.instant('schedule.recalculate.thorough.completed'),
      SCHEDULE_HEADER_RECALCULATE_THOROUGH_TOAST,
      '',
      TOAST_ICONS.INFO,
    );
    this.dataManagementSchedule.readDatas();
  }
}
