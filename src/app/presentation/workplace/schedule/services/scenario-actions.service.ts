// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Single place for the decisions on the active what-if scenario (accept, reject, back to the original),
 * shared by the scenario selector and the scenario banner so both behave identically.
 * Accept and reject ask for confirmation first. A 409 on accept is the compliance block and offers the
 * authorised-only supervisor override as one explicitly confirmed second attempt; a 409 carrying the
 * "scenario not active" code means the scenario was already decided elsewhere, so the list is reloaded
 * and the view returns to the original plan instead of offering an override that cannot succeed.
 * @param canDecide - Whether the signed-in user may accept or reject (schedule edit right)
 */

import { computed, inject, Injectable } from '@angular/core';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS, ROLE_ADMIN, ROLE_AUTHORISED } from 'src/app/domain/constants/permissions.constants';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { isScenarioNotActiveError } from 'src/app/domain/models/schedule/scenario-not-active.model';

@Injectable({ providedIn: 'root' })
export class ScenarioActionsService {
  private analyseScenarioService = inject(AnalyseScenarioService);
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private modalService = inject(ModalService);
  private authorizationService = inject(AuthorizationService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);

  readonly canDecide = computed(() => this.authorizationService.hasPermission(PERMISSIONS.CanEditSchedule));

  exit(): void {
    this.analyseScenarioService.exitScenario();
  }

  confirmAccept(): void {
    const scenario = this.analyseScenarioService.activeScenario();
    if (!scenario) return;

    this.modalService.openModal({
      type: ModalType.Confirmation,
      title: this.translateService.instant('scenario.accept'),
      message: this.translateService.instant('scenario.accept.confirm', { name: scenario.name }),
      confirmText: this.translateService.instant('scenario.accept'),
      cancelText: this.translateService.instant('cancel'),
      onConfirm: () => this.accept(scenario.id),
    });
  }

  confirmReject(): void {
    const scenario = this.analyseScenarioService.activeScenario();
    if (!scenario) return;

    this.modalService.openModal({
      type: ModalType.Confirmation,
      title: this.translateService.instant('scenario.reject'),
      message: this.translateService.instant('scenario.reject.confirm', { name: scenario.name }),
      confirmText: this.translateService.instant('scenario.reject'),
      cancelText: this.translateService.instant('cancel'),
      onConfirm: () => this.reject(scenario.id),
    });
  }

  private accept(id: string): void {
    this.analyseScenarioService.acceptScenario(id).subscribe({
      next: () => undefined,
      error: (err: HttpErrorResponse) => this.handleAcceptError(id, err),
    });
  }

  private reject(id: string): void {
    this.analyseScenarioService.rejectScenario(id).subscribe({
      next: () => undefined,
      error: (err: HttpErrorResponse) => {
        if (isScenarioNotActiveError(err)) {
          this.handleNotActive();
        }
      },
    });
  }

  private handleAcceptError(id: string, err: HttpErrorResponse): void {
    if (isScenarioNotActiveError(err)) {
      this.handleNotActive();
      return;
    }

    if (err.status !== HttpStatusCode.Conflict) return;

    const detail =
      (err.error as { detail?: string } | null)?.detail ??
      this.translateService.instant('schedule.scenario.accept.blockedTitle');

    if (this.authorizationService.hasAnyPermission(ROLE_ADMIN, ROLE_AUTHORISED)) {
      this.modalService.openModal({
        type: ModalType.Confirmation,
        title: this.translateService.instant('schedule.scenario.accept.overrideConfirmTitle'),
        message: detail,
        confirmText: this.translateService.instant('schedule.scenario.accept.overrideConfirmButton'),
        cancelText: this.translateService.instant('cancel'),
        onConfirm: () => this.overrideAccept(id),
      });
    } else {
      this.toastShowService.showError(detail);
    }
  }

  private overrideAccept(id: string): void {
    this.analyseScenarioService.acceptScenario(id, true).subscribe({
      next: () => undefined,
      error: (err: HttpErrorResponse) => {
        if (isScenarioNotActiveError(err)) {
          this.handleNotActive();
          return;
        }

        const message =
          err.status === HttpStatusCode.Conflict
            ? this.translateService.instant('schedule.scenario.accept.overrideRejected')
            : ((err.error as { detail?: string } | null)?.detail ??
                this.translateService.instant('schedule.scenario.accept.overrideRejected'));
        this.toastShowService.showError(message);
      },
    });
  }

  private handleNotActive(): void {
    this.toastShowService.showError(this.translateService.instant('scenario.notActive'));
    this.analyseScenarioService.exitScenario();
    this.analyseScenarioService.loadScenarios(this.dataManagementSchedule.workFilter.selectedGroup);
  }
}
