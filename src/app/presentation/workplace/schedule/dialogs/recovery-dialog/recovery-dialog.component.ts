// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Dialog for the reactive recovery flow. The dispatcher marks an employee absent on a day with an absence
 * type; the deterministic recovery engine proposes a rule-compliant replacement as an isolated, propose-only
 * scenario which is then selected for human review. The dialog never accepts the scenario.
 * @param clients - Visible schedule employees to pick the absent one from
 * @param absences - Absence types (sick/vacation/...) loaded from the catalog
 */
import { ChangeDetectionStrategy, Component, TemplateRef, inject, signal, viewChild } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { DataRecoveryService } from 'src/app/infrastructure/api/schedule/data-recovery.service';
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

  private readonly formModel = signal<{
    selectedClientId: string;
    selectedAbsenceId: string;
    selectedDate: string;
  }>({ selectedClientId: '', selectedAbsenceId: '', selectedDate: '' });
  protected readonly recoveryForm = form(this.formModel);

  async open(): Promise<void> {
    this.clients.set(this.dataManagementSchedule.clients);
    await this.absenceLookup.loadIfNeeded();
    this.absences.set(this.absenceLookup.absences());

    const start = this.dataManagementSchedule.periodStartDate;
    this.formModel.set({
      selectedClientId: '',
      selectedAbsenceId: '',
      selectedDate: start ? this.toIsoDate(start) : '',
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
    const { selectedClientId, selectedAbsenceId, selectedDate } = this.formModel();
    return !!selectedClientId && !!selectedAbsenceId && !!selectedDate && !this.isSubmitting();
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

    const { selectedClientId, selectedAbsenceId, selectedDate } = this.formModel();
    this.isSubmitting.set(true);
    try {
      const outcome = await firstValueFrom(
        this.recoveryService.coverAbsence({
          clientId: selectedClientId,
          date: selectedDate,
          groupId,
          absenceId: selectedAbsenceId,
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

      this.toastShowService.showSuccess(
        this.translateService.instant('recovery.dialog.proposed', {
          covered: outcome.covered.length,
          uncovered: outcome.uncovered.length,
        }),
        '',
      );

      this.modalRef?.close();
    } catch {
      this.toastShowService.showError(this.translateService.instant('recovery.dialog.failed'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onClose(): void {
    this.modalRef?.close();
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
