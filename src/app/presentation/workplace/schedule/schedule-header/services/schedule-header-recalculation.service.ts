// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Period-hours recalculation from the schedule header (admins only): the normal run resets its busy flag when the
 * request returns, the thorough run (after confirmation) keeps it until the matching SignalR completion arrives. When
 * the backend reports frozen (sealed and exported) client periods it left unchanged, the admin is offered to include
 * them; that asks for a mandatory reason and sends the same run again with the override. The thorough override is sent
 * even while the first thorough run still waits for its completion.
 * @param destroyRef - Lifetime of the header component that ends the completion and dialog subscriptions
 */
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { ROLE_ADMIN } from 'src/app/domain/constants/permissions.constants';
import { SCHEDULE_SIGNALR } from 'src/app/domain/interfaces/schedule-signalr.interface';
import { IThoroughRecalculationCompletedNotification } from 'src/app/domain/interfaces/thorough-recalculation-completed-notification.interface';
import { IFrozenPeriodOverride } from 'src/app/domain/models/schedule/frozen-period-override.interface';
import { IPeriodHoursRecalculationResult } from 'src/app/domain/models/schedule/period-hours-recalculation-result.interface';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { PeriodHoursRecalculationService } from 'src/app/domain/services/schedule/period-hours-recalculation.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { ModalType } from 'src/app/presentation/modal/modal-type.enum';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { TOAST_ICONS } from 'src/app/presentation/toast/toast-icons.constants';
import {
  SCHEDULE_HEADER_FROZEN_REASON_CONTEXT,
  SCHEDULE_HEADER_RECALCULATE_THOROUGH_TOAST,
  SCHEDULE_HEADER_RECALCULATE_TOAST,
} from '../schedule-header.constants';

type RecalculationKind = 'normal' | 'thorough';

@Injectable()
export class ScheduleHeaderRecalculationService {
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private analyseScenarioService = inject(AnalyseScenarioService);
  private periodHoursRecalculation = inject(PeriodHoursRecalculationService);
  private scheduleSignalR = inject(SCHEDULE_SIGNALR);
  private modalService = inject(ModalService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);
  private authorizationService = inject(AuthorizationService);

  readonly isRecalculating = signal(false);
  readonly canRecalculate = computed(() => this.authorizationService.hasPermission(ROLE_ADMIN));

  private pendingOverride: RecalculationKind | null = null;

  connect(destroyRef: DestroyRef): void {
    this.scheduleSignalR.thoroughRecalculationCompleted$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((notification) => this.onThoroughRecalculationCompleted(notification));

    this.modalService.resultEvent
      .pipe(
        filter((type) => type === ModalType.Input && this.ownsInputDialog()),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe(() => this.onFrozenReasonEntered());

    this.modalService.reasonEvent
      .pipe(
        filter((type) => type === ModalType.Input && this.ownsInputDialog()),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe(() => this.releaseInputDialog());
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

    const result = await this.runThorough();
    if (result) {
      this.offerFrozenOverride('thorough', result);
    }
  }

  async onRecalculatePeriodHours(): Promise<void> {
    if (this.isRecalculating()) return;

    const result = await this.runNormal();
    if (result) {
      this.offerFrozenOverride('normal', result);
    }
  }

  private async runThorough(frozenOverride?: IFrozenPeriodOverride): Promise<IPeriodHoursRecalculationResult | null> {
    const startDate = this.dataManagementSchedule.periodStartDate;
    const endDate = this.dataManagementSchedule.periodEndDate;
    if (!startDate || !endDate) return null;

    this.isRecalculating.set(true);

    try {
      const result = await this.periodHoursRecalculation.recalculateThorough(startDate, endDate, frozenOverride);

      this.toastShowService.showInfo(
        this.translateService.instant('schedule.recalculate.thorough.started'),
        SCHEDULE_HEADER_RECALCULATE_THOROUGH_TOAST,
        '',
        TOAST_ICONS.INFO,
      );
      return result;
    } catch {
      this.isRecalculating.set(false);
      this.toastShowService.showError(
        this.translateService.instant('schedule.recalculate.thorough.error'),
        SCHEDULE_HEADER_RECALCULATE_THOROUGH_TOAST,
      );
      return null;
    }
  }

  private async runNormal(frozenOverride?: IFrozenPeriodOverride): Promise<IPeriodHoursRecalculationResult | null> {
    const startDate = this.dataManagementSchedule.periodStartDate;
    const endDate = this.dataManagementSchedule.periodEndDate;
    if (!startDate || !endDate) return null;

    this.isRecalculating.set(true);

    try {
      const result = await this.periodHoursRecalculation.recalculate(startDate, endDate, frozenOverride);

      this.toastShowService.showInfo(
        this.translateService.instant('schedule.recalculate.success'),
        SCHEDULE_HEADER_RECALCULATE_TOAST,
        '',
        TOAST_ICONS.INFO,
      );
      return result;
    } catch {
      this.toastShowService.showError(
        this.translateService.instant('schedule.recalculate.error'),
        SCHEDULE_HEADER_RECALCULATE_TOAST,
      );
      return null;
    } finally {
      this.isRecalculating.set(false);
    }
  }

  private offerFrozenOverride(kind: RecalculationKind, result: IPeriodHoursRecalculationResult): void {
    if (!result.frozenSkipped) return;

    this.modalService.openModal({
      type: ModalType.Confirmation,
      title: this.translateService.instant('schedule.recalculate.frozen.title'),
      message: this.translateService.instant('schedule.recalculate.frozen.message', { count: result.frozenSkipped }),
      confirmText: this.translateService.instant('schedule.recalculate.frozen.include'),
      cancelText: this.translateService.instant('cancel'),
      onConfirm: () => this.askFrozenReason(kind),
    });
  }

  private askFrozenReason(kind: RecalculationKind): void {
    this.pendingOverride = kind;
    this.modalService.componentContext = SCHEDULE_HEADER_FROZEN_REASON_CONTEXT;
    this.modalService.contentInputTitle = this.translateService.instant('schedule.recalculate.frozen.reason');
    this.modalService.contentInputString = '';
    this.modalService.openModel(ModalType.Input);
  }

  private ownsInputDialog(): boolean {
    return this.modalService.componentContext === SCHEDULE_HEADER_FROZEN_REASON_CONTEXT;
  }

  private releaseInputDialog(): RecalculationKind | null {
    const kind = this.pendingOverride;
    this.pendingOverride = null;
    this.modalService.componentContext = '';
    return kind;
  }

  private onFrozenReasonEntered(): void {
    const reason = this.modalService.contentInputString.trim();
    const kind = this.releaseInputDialog();
    if (!kind || !reason) return;

    const frozenOverride: IFrozenPeriodOverride = { confirmFrozen: true, reason };
    if (kind === 'thorough') {
      void this.runThorough(frozenOverride);
    } else if (!this.isRecalculating()) {
      void this.runNormal(frozenOverride);
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
