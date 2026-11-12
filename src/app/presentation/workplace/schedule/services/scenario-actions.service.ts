// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Single place for the decisions on the active what-if scenario (accept, reject, back to the original),
 * shared by the scenario selector and the scenario banner so both behave identically.
 * Accept and reject ask for confirmation first. Accept can then meet two independent warnings, each confirmed on
 * its own and carried into every further attempt, so one click never skips the other:
 * - a 409 with the "scenario stale" code: the original plan changed after the scenario was created, and accepting
 *   overwrites those changes; the user sees what changed and may accept anyway (overrideStale);
 * - any other 409: the compliance block, which offers the authorised-only supervisor override (overrideBlock).
 * The stale warning of an absence cover built on the real plan, and of every scenario built on such a cover, is not
 * overridable: the dialog offers no "accept anyway", only to discard the current scenario and open the absence dialog again
 * on the original plan, prefilled with the person, type and days of the scenario's absences that are not real yet. A stale
 * warning that comes back after it was acknowledged is shown as an error and never taken for the compliance block.
 * A 409 with the "drops real absence" code means accepting would delete real absences the scenario does not carry; it
 * names them and offers only to discard the scenario, never an override.
 * A 409 carrying the "scenario not active" code means the scenario was already decided elsewhere, so the list is
 * reloaded and the view returns to the original plan instead of offering an override that cannot succeed.
 * After a successful accept, entries the backend did not take over because they fall on a locked day are reported
 * in a toast with a warning icon and their number.
 * A scenario that carries variants (keys) turns them into real shifts when accepted, so accepting it also needs the
 * right to edit shifts. Before the confirmation such a scenario loads its summary and the confirmation names the
 * slots of its keys that are still open and warns about copies: a copy is a template, so after the accept original and
 * copy both count; a summary that cannot be loaded never blocks, the generic text is shown. A 409
 * with the "variant consumed" code (another accepted scenario already used a key) names the keys in a toast and offers
 * to discard the scenario, never an override; a 403 shows a toast and offers nothing.
 * @param canDecide - Whether the signed-in user may accept or reject (schedule edit right)
 * @param canAccept - Whether the signed-in user may accept the open scenario (canDecide, plus the shift edit right when
 *   the scenario carries keys)
 */

import { computed, inject, Injectable } from '@angular/core';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { ModalType } from 'src/app/presentation/modal/modal-type.enum';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { LocaleService } from 'src/app/application/services/locale.service';
import { PERMISSIONS, ROLE_ADMIN, ROLE_AUTHORISED } from 'src/app/domain/constants/permissions.constants';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { isScenarioNotActiveError } from 'src/app/domain/models/schedule/scenario-not-active.model';
import {
  isScenarioVariantConsumedError,
  readConsumedVariantNames,
} from 'src/app/domain/models/schedule/scenario-variant-consumed.model';
import { IAnalyseScenario } from 'src/app/domain/models/schedule/analyse-scenario-class';
import { IScenarioVariantCoverage } from 'src/app/domain/models/schedule/scenario-variant-coverage.interface';
import { SCENARIO_VARIANT_ACCEPT_COPIED_SHIFTS_KEYS } from 'src/app/domain/constants/scenario-variant.constants';
import { scenarioVariantCountKey } from 'src/app/domain/helpers/scenario-variant-count-key.helper';
import { ScenarioSummary } from 'src/app/domain/models/schedule/scenario-summary.model';
import {
  NO_SCENARIO_ACCEPT_OVERRIDES,
  readScenarioStaleness,
} from 'src/app/domain/models/schedule/scenario-stale.model';
import { readScenarioDroppedAbsences } from 'src/app/domain/models/schedule/scenario-drops-real-absence.model';
import { IScenarioDroppedAbsences } from 'src/app/domain/interfaces/scenario-dropped-absences.interface';
import { IScenarioCoverRedoPreset } from 'src/app/domain/interfaces/scenario-cover-redo-preset.interface';
import { IScenarioAcceptOverrides } from 'src/app/domain/interfaces/scenario-accept-overrides.interface';
import { IScenarioStaleness } from 'src/app/domain/interfaces/scenario-staleness.interface';
import { IScenarioAcceptResult } from 'src/app/domain/interfaces/scenario-accept-result.interface';
import { TOAST_ICONS } from 'src/app/presentation/toast/toast-icons.constants';
import { formatCompanyInstant } from 'src/app/domain/helpers/company-date-time.formatter';
import { companyTimeZone, parseCalendarDate } from 'src/app/domain/helpers/calendar-date.helper';
import { formatCalendarDate } from 'src/app/domain/helpers/locale-date-format.helper';
import { RecoveryDialogLauncherService } from './recovery-dialog-launcher.service';
import { IRecoveryDialogPreset } from './recovery-dialog-preset.interface';

const SCENARIO_NAME_SEPARATOR = ', ';
const LOCKED_SKIPPED_TOAST_NAME = 'scenario-accept-locked-skipped';
const STALE_MESSAGE_KEY = 'scenario.accept.staleMessage';
const COVER_STALE_MESSAGE_KEY = 'scenario.accept.coverStaleMessage';

@Injectable({ providedIn: 'root' })
export class ScenarioActionsService {
  private analyseScenarioService = inject(AnalyseScenarioService);
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private modalService = inject(ModalService);
  private authorizationService = inject(AuthorizationService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);
  private localeService = inject(LocaleService);
  private recoveryLauncher = inject(RecoveryDialogLauncherService);

  readonly canDecide = computed(() => this.authorizationService.hasPermission(PERMISSIONS.CanEditSchedule));

  readonly canAccept = computed(() => {
    if (!this.canDecide()) return false;

    return !this.carriesVariants(this.analyseScenarioService.activeScenario()) ||
      this.authorizationService.hasPermission(PERMISSIONS.CanEditShifts);
  });

  exit(): void {
    this.analyseScenarioService.exitScenario();
  }

  confirmAccept(): void {
    const scenario = this.analyseScenarioService.activeScenario();
    if (!scenario) return;

    if (!this.carriesVariants(scenario)) {
      this.openAcceptConfirmation(scenario, this.plainAcceptMessage(scenario));
      return;
    }

    this.analyseScenarioService.loadSummary(scenario.id).subscribe({
      next: (summary) => this.openAcceptConfirmation(scenario, this.variantAcceptMessage(scenario, summary)),
      error: () => this.openAcceptConfirmation(scenario, this.plainAcceptMessage(scenario)),
    });
  }

  private openAcceptConfirmation(scenario: IAnalyseScenario, message: string): void {
    this.modalService.openModal({
      type: ModalType.Confirmation,
      title: this.translateService.instant('scenario.accept'),
      message,
      confirmText: this.translateService.instant('scenario.accept'),
      cancelText: this.translateService.instant('cancel'),
      onConfirm: () => this.accept(scenario.id, NO_SCENARIO_ACCEPT_OVERRIDES),
    });
  }

  private carriesVariants(scenario: IAnalyseScenario | null): boolean {
    return (scenario?.variantIds?.length ?? 0) > 0;
  }

  private plainAcceptMessage(scenario: IAnalyseScenario): string {
    return this.translateService.instant('scenario.accept.confirm', { name: scenario.name });
  }

  private variantAcceptMessage(scenario: IAnalyseScenario, summary: ScenarioSummary): string {
    const variants = summary.variants ?? [];
    const message = this.openSlotsMessage(scenario, variants);
    const copiesWarning = this.copiedShiftsWarning(variants);

    return copiesWarning ? `${message} ${copiesWarning}` : message;
  }

  private openSlotsMessage(scenario: IAnalyseScenario, variants: IScenarioVariantCoverage[]): string {
    const openVariants = variants.filter((variant) => variant.openSlots > 0);
    if (openVariants.length === 0) {
      return this.plainAcceptMessage(scenario);
    }

    return this.translateService.instant('scenarioVariant.accept.confirmOpenSlots', {
      name: scenario.name,
      count: openVariants.reduce((sum, variant) => sum + variant.openSlots, 0),
      keys: openVariants.map((variant) => `${variant.name} (${variant.openSlots})`).join(SCENARIO_NAME_SEPARATOR),
    });
  }

  private copiedShiftsWarning(variants: IScenarioVariantCoverage[]): string | null {
    const copyingVariants = variants.filter((variant) => variant.copiedShiftCount > 0);
    if (copyingVariants.length === 0) {
      return null;
    }

    const count = copyingVariants.reduce((sum, variant) => sum + variant.copiedShiftCount, 0);
    return this.translateService.instant(scenarioVariantCountKey(SCENARIO_VARIANT_ACCEPT_COPIED_SHIFTS_KEYS, count), {
      count,
      keys: copyingVariants.map((variant) => `${variant.name} (${variant.copiedShiftCount})`).join(SCENARIO_NAME_SEPARATOR),
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
      next: (result) => this.reportLockedSkips(result),
      error: (err: HttpErrorResponse) => this.handleAcceptError(id, overrides, err),
    });
  }

  private reportLockedSkips(result: IScenarioAcceptResult | null): void {
    const skipped = result?.skippedLockedTotal ?? 0;
    if (skipped <= 0) return;

    this.toastShowService.showInfo(
      this.translateService.instant('scenario.accept.lockedSkipped', { count: skipped }),
      LOCKED_SKIPPED_TOAST_NAME,
      '',
      TOAST_ICONS.WARNING,
    );
  }

  private reject(id: string, onRejected?: () => void): void {
    this.analyseScenarioService.rejectScenario(id).subscribe({
      next: () => onRejected?.(),
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

    if (isScenarioVariantConsumedError(err)) {
      this.handleVariantConsumed(err);
      return;
    }

    if (err.status === HttpStatusCode.Forbidden) {
      this.toastShowService.showError(this.translateService.instant('scenarioVariant.accept.forbidden'));
      return;
    }

    const droppedAbsences = readScenarioDroppedAbsences(err);
    if (droppedAbsences) {
      this.explainDroppedAbsences(id, droppedAbsences);
      return;
    }

    const staleness = readScenarioStaleness(err);
    if (staleness) {
      this.handleStale(id, overrides, staleness);
      return;
    }

    if (overrides.overrideBlock) {
      this.handleOverrideRejected(err);
      return;
    }

    if (err.status !== HttpStatusCode.Conflict) return;

    this.offerComplianceOverride(id, overrides, err);
  }

  private handleStale(id: string, overrides: IScenarioAcceptOverrides, staleness: IScenarioStaleness): void {
    if (!staleness.overridable) {
      this.offerCoverRedo(id, staleness);
      return;
    }

    if (!overrides.overrideStale) {
      this.confirmStaleOverwrite(id, overrides, staleness);
      return;
    }

    this.toastShowService.showError(this.buildStaleMessage(staleness));
  }

  private offerCoverRedo(id: string, staleness: IScenarioStaleness): void {
    const preset = this.toRecoveryPreset(staleness.coverRedo);
    this.modalService.openModal({
      type: ModalType.Confirmation,
      title: this.translateService.instant('scenario.accept.coverStaleTitle'),
      message: this.buildStaleMessage(staleness, COVER_STALE_MESSAGE_KEY),
      confirmText: this.translateService.instant('scenario.accept.coverStaleRedoButton'),
      cancelText: this.translateService.instant('cancel'),
      onConfirm: () => this.reject(id, () => this.recoveryLauncher.requestOpen(preset)),
    });
  }

  private toRecoveryPreset(coverRedo: IScenarioCoverRedoPreset | null): IRecoveryDialogPreset {
    const date = parseCalendarDate(coverRedo?.fromDate) ?? undefined;
    const untilDate = parseCalendarDate(coverRedo?.untilDate) ?? undefined;
    if (!coverRedo?.clientId) {
      return { date, untilDate };
    }

    return { clientId: coverRedo.clientId, absenceId: coverRedo.absenceId, date, untilDate };
  }

  private explainDroppedAbsences(id: string, dropped: IScenarioDroppedAbsences): void {
    this.modalService.openModal({
      type: ModalType.Confirmation,
      title: this.translateService.instant('scenario.accept.dropsAbsenceTitle'),
      message: this.buildDroppedAbsencesMessage(dropped),
      confirmText: this.translateService.instant('scenario.reject'),
      cancelText: this.translateService.instant('close'),
      onConfirm: () => this.reject(id),
    });
  }

  private buildDroppedAbsencesMessage(dropped: IScenarioDroppedAbsences): string {
    const locale = this.localeService.getLocale();
    const listed = dropped.droppedAbsences.map(
      (absence) => `${absence.clientName} ${formatCalendarDate(absence.date, locale) ?? absence.date}`,
    );
    const remaining = dropped.droppedAbsenceCount - dropped.droppedAbsences.length;
    if (remaining > 0) {
      listed.push(this.translateService.instant('scenario.accept.dropsAbsenceMore', { count: remaining }));
    }

    return this.translateService.instant('scenario.accept.dropsAbsenceMessage', {
      count: dropped.droppedAbsenceCount,
      absences: listed.join(SCENARIO_NAME_SEPARATOR),
    });
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

  private buildStaleMessage(staleness: IScenarioStaleness, messageKey = STALE_MESSAGE_KEY): string {
    const lastChange =
      formatCompanyInstant(staleness.lastChangeUtc, 'dateTime', this.localeService.getLocale(), companyTimeZone()) ??
      staleness.lastChangeUtc;
    const message = this.translateService.instant(messageKey, {
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

  private handleVariantConsumed(err: HttpErrorResponse): void {
    const names = readConsumedVariantNames(err) ?? [];
    const message =
      names.length > 0
        ? this.translateService.instant('scenarioVariant.accept.consumed', { names: names.join(SCENARIO_NAME_SEPARATOR) })
        : this.translateService.instant('scenarioVariant.accept.consumedUnnamed');
    this.toastShowService.showError(message);
    this.confirmReject();
  }

  private handleNotActive(): void {
    this.toastShowService.showError(this.translateService.instant('scenario.notActive'));
    this.analyseScenarioService.exitScenario();
    this.analyseScenarioService.loadScenarios(this.dataManagementSchedule.workFilter.selectedGroup);
  }
}
