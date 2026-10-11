// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Single place for the decisions on the active what-if scenario (accept, reject, back to the original),
 * shared by the scenario selector and the scenario banner so both behave identically.
 * Accept and reject ask for confirmation first. Accept can then meet two independent warnings, each confirmed on
 * its own and carried into every further attempt, so one click never skips the other:
 * - a 409 with the "scenario stale" code: the original plan changed after the scenario was created, and accepting
 *   overwrites those changes; the user sees what changed and may accept anyway (overrideStale);
 * - any other 409: the compliance block, which offers the authorised-only supervisor override (overrideBlock).
 * A 409 carrying the "scenario not active" code means the scenario was already decided elsewhere, so the list is
 * reloaded and the view returns to the original plan instead of offering an override that cannot succeed.
 * @param canDecide - Whether the signed-in user may accept or reject (schedule edit right)
 */

import { computed, inject, Injectable } from '@angular/core';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { LocaleService } from 'src/app/application/services/locale.service';
import { PERMISSIONS, ROLE_ADMIN, ROLE_AUTHORISED } from 'src/app/domain/constants/permissions.constants';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { isScenarioNotActiveError } from 'src/app/domain/models/schedule/scenario-not-active.model';
import {
  NO_SCENARIO_ACCEPT_OVERRIDES,
  readScenarioStaleness,
} from 'src/app/domain/models/schedule/scenario-stale.model';
import { IScenarioAcceptOverrides } from 'src/app/domain/interfaces/scenario-accept-overrides.interface';
import { IScenarioStaleness } from 'src/app/domain/interfaces/scenario-staleness.interface';
import { formatCompanyInstant } from 'src/app/shared/pipes/company-date-time/company-date-time.formatter';
import { companyTimeZone } from 'src/app/shared/helpers/calendar-date.helper';

const SCENARIO_NAME_SEPARATOR = ', ';

@Injectable({ providedIn: 'root' })
export class ScenarioActionsService {
  private analyseScenarioService = inject(AnalyseScenarioService);
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private modalService = inject(ModalService);
  private authorizationService = inject(AuthorizationService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);
  private localeService = inject(LocaleService);

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
      onConfirm: () => this.accept(scenario.id, NO_SCENARIO_ACCEPT_OVERRIDES),
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

  private accept(id: string, overrides: IScenarioAcceptOverrides): void {
    this.analyseScenarioService.acceptScenario(id, overrides).subscribe({
      next: () => undefined,
      error: (err: HttpErrorResponse) => this.handleAcceptError(id, overrides, err),
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

  private handleAcceptError(id: string, overrides: IScenarioAcceptOverrides, err: HttpErrorResponse): void {
    if (isScenarioNotActiveError(err)) {
      this.handleNotActive();
      return;
    }

    const staleness = readScenarioStaleness(err);
    if (staleness && !overrides.overrideStale) {
      this.confirmStaleOverwrite(id, overrides, staleness);
      return;
    }

    if (overrides.overrideBlock) {
      this.handleOverrideRejected(err);
      return;
    }

    if (err.status !== HttpStatusCode.Conflict) return;

    this.offerComplianceOverride(id, overrides, err);
  }

  private confirmStaleOverwrite(id: string, overrides: IScenarioAcceptOverrides, staleness: IScenarioStaleness): void {
    this.modalService.openModal({
      type: ModalType.Confirmation,
      title: this.translateService.instant('scenario.accept.staleTitle'),
      message: this.buildStaleMessage(staleness),
      confirmText: this.translateService.instant('scenario.accept.staleConfirmButton'),
      cancelText: this.translateService.instant('cancel'),
      onConfirm: () => this.accept(id, { ...overrides, overrideStale: true }),
    });
  }

  private buildStaleMessage(staleness: IScenarioStaleness): string {
    const lastChange =
      formatCompanyInstant(staleness.lastChangeUtc, 'dateTime', this.localeService.getLocale(), companyTimeZone()) ??
      staleness.lastChangeUtc;
    const message = this.translateService.instant('scenario.accept.staleMessage', {
      count: staleness.changedEntryCount,
      lastChange,
    });

    if (staleness.acceptedScenarioNames.length === 0) {
      return message;
    }

    const acceptedScenarios = this.translateService.instant('scenario.accept.staleAcceptedScenarios', {
      names: staleness.acceptedScenarioNames.join(SCENARIO_NAME_SEPARATOR),
    });
    return `${message} ${acceptedScenarios}`;
  }

  private offerComplianceOverride(id: string, overrides: IScenarioAcceptOverrides, err: HttpErrorResponse): void {
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
        onConfirm: () => this.accept(id, { ...overrides, overrideBlock: true }),
      });
    } else {
      this.toastShowService.showError(detail);
    }
  }

  private handleOverrideRejected(err: HttpErrorResponse): void {
    const message =
      err.status === HttpStatusCode.Conflict
        ? this.translateService.instant('schedule.scenario.accept.overrideRejected')
        : ((err.error as { detail?: string } | null)?.detail ??
            this.translateService.instant('schedule.scenario.accept.overrideRejected'));
    this.toastShowService.showError(message);
  }

  private handleNotActive(): void {
    this.toastShowService.showError(this.translateService.instant('scenario.notActive'));
    this.analyseScenarioService.exitScenario();
    this.analyseScenarioService.loadScenarios(this.dataManagementSchedule.workFilter.selectedGroup);
  }
}
