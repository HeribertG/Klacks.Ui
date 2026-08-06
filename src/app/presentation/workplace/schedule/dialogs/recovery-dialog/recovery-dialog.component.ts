// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Dialog for the reactive recovery flow. The dispatcher marks an employee absent - a single day or a
 * range - with an absence type; the deterministic recovery engine proposes a rule-compliant replacement as
 * an isolated, propose-only scenario. The dialog then shows WHAT was proposed instead of a toast with two
 * numbers: which slot got whom, how far the engine had to search, what stayed open and why. The dialog
 * never accepts the scenario; a person decides.
 * @param clients - Visible schedule employees to pick the absent one from
 * @param absences - Absence types (sick/vacation/...) loaded from the catalog
 */
import { ChangeDetectionStrategy, Component, TemplateRef, inject, signal, viewChild } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import {
  DataRecoveryService,
  ICoverAbsenceOutcome,
} from 'src/app/infrastructure/api/schedule/data-recovery.service';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import { IClientWork } from 'src/app/domain/models/schedule/schedule-class';
import { IAbsence } from 'src/app/domain/models/absence/absence-class';
import { IAnalyseScenario, AnalyseScenarioStatus } from 'src/app/domain/models/schedule/analyse-scenario-class';

const RECOVERY_CREATOR = 'recovery';

@Component({
  selector: 'app-recovery-dialog',
  templateUrl: './recovery-dialog.component.html',
  styleUrls: ['./recovery-dialog.component.scss'],
  standalone: true,
  imports: [FormField, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AbsenceLookupService],
})
export class RecoveryDialogComponent {
  readonly modalTemplate = viewChild.required<TemplateRef<unknown>>('recoveryModal');

  private readonly ngbModal = inject(NgbModal);
  private readonly recoveryService = inject(DataRecoveryService);
  private readonly analyseScenarioService = inject(AnalyseScenarioService);
  private readonly dataManagementSchedule = inject(DataManagementScheduleService);
  private readonly absenceLookup = inject(AbsenceLookupService);
  private readonly toastShowService = inject(ToastShowService);
  private readonly translateService = inject(TranslateService);

  private modalRef: NgbModalRef | null = null;

  protected readonly clients = signal<IClientWork[]>([]);
  protected readonly absences = signal<IAbsence[]>([]);
  protected readonly isSubmitting = signal(false);

  /** Result of the last run; while it is set the dialog shows the review step instead of the form. */
  protected readonly result = signal<ICoverAbsenceOutcome | null>(null);
  protected readonly localError = signal<string | null>(null);

  private readonly formModel = signal<{
    selectedClientId: string;
    selectedAbsenceId: string;
    selectedDate: string;
    selectedUntilDate: string;
    overrideBlock: boolean;
  }>({
    selectedClientId: '',
    selectedAbsenceId: '',
    selectedDate: '',
    selectedUntilDate: '',
    overrideBlock: false,
  });
  protected readonly recoveryForm = form(this.formModel);

  async open(): Promise<void> {
    this.clients.set(this.dataManagementSchedule.clients);
    await this.absenceLookup.loadIfNeeded();
    this.absences.set(this.absenceLookup.absences());

    const start = this.dataManagementSchedule.periodStartDate;
    this.result.set(null);
    this.localError.set(null);
    this.formModel.set({
      selectedClientId: '',
      selectedAbsenceId: '',
      selectedDate: start ? this.toIsoDate(start) : '',
      selectedUntilDate: '',
      overrideBlock: false,
    });

    this.modalRef = this.ngbModal.open(this.modalTemplate(), { centered: true, size: 'md' });
  }

  protected clientLabel(client: IClientWork): string {
    return [client.firstName, client.name].filter(Boolean).join(' ') || client.id;
  }

  protected absenceLabel(absence: IAbsence): string {
    return getLocalizedValue(absence.name, this.translateService.currentLang) || (absence.id ?? '');
  }

  protected canSubmit(): boolean {
    const { selectedClientId, selectedAbsenceId, selectedDate, selectedUntilDate } = this.formModel();
    if (!selectedClientId || !selectedAbsenceId || !selectedDate || this.isSubmitting()) {
      return false;
    }

    // An empty end means a single day; a filled one must not lie before the start.
    return !selectedUntilDate || selectedUntilDate >= selectedDate;
  }

  /** Translation key for the reason a slot stayed open, so the review shows prose, not an engine token. */
  protected uncoveredReasonKey(reason: string): string {
    switch (reason) {
      case 'locked':
        return 'recovery.dialog.reason.locked';
      case 'blocked':
        return 'recovery.dialog.reason.blocked';
      case 'non-critical':
        return 'recovery.dialog.reason.nonCritical';
      default:
        return 'recovery.dialog.reason.noCandidate';
    }
  }

  /** Translation key for how far the engine had to search to fill a slot. */
  protected tierKey(tier: number): string {
    return `recovery.dialog.tier.${tier}`;
  }

  async onSubmit(): Promise<void> {
    if (!this.canSubmit()) {
      return;
    }

    const groupId = this.dataManagementSchedule.workFilter.selectedGroup;
    if (!groupId) {
      this.toastShowService.showError(this.translateService.instant('recovery.dialog.noGroup'));
      return;
    }

    const { selectedClientId, selectedAbsenceId, selectedDate, selectedUntilDate, overrideBlock } =
      this.formModel();
    this.isSubmitting.set(true);
    this.localError.set(null);
    try {
      const outcome = await firstValueFrom(
        this.recoveryService.coverAbsence({
          clientId: selectedClientId,
          date: selectedDate,
          groupId,
          absenceId: selectedAbsenceId,
          untilDate: selectedUntilDate || undefined,
          overrideBlock: overrideBlock || undefined,
        }),
      );

      const newScenario: IAnalyseScenario = {
        id: outcome.scenarioId,
        name: outcome.scenarioName,
        token: outcome.token,
        fromDate: '',
        untilDate: '',
        createdByUser: RECOVERY_CREATOR,
        status: AnalyseScenarioStatus.Active,
      };

      this.analyseScenarioService.scenarios.update((list) =>
        list.some((s) => s.id === newScenario.id) ? list : [...list, newScenario],
      );
      this.analyseScenarioService.selectScenario(newScenario);
      this.dataManagementSchedule.readDatas();

      // Stay open and show what was proposed. Closing on a toast with two numbers left the dispatcher
      // to hunt through the schedule for what actually changed and what is still uncovered.
      this.result.set(outcome);
    } catch (err: unknown) {
      this.localError.set(this.errorMessage(err));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onClose(): void {
    this.modalRef?.close();
  }

  /** Back to the form to try another day or another absence without reopening the dialog. */
  protected onBackToForm(): void {
    this.result.set(null);
    this.localError.set(null);
  }

  /**
   * The controller answers with ProblemDetails, so the reason is in `detail`. Showing it beats a generic
   * message: a refused range or a blocking rule is something the dispatcher can act on.
   */
  private errorMessage(err: unknown): string {
    const body = (err as { error?: { detail?: unknown; message?: unknown } } | null)?.error;
    if (typeof body?.detail === 'string' && body.detail.length > 0) {
      return body.detail;
    }

    if (typeof body?.message === 'string' && body.message.length > 0) {
      return body.message;
    }

    return this.translateService.instant('recovery.dialog.failed');
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
