// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Modal dialog for creating a new what-if scenario. The period and group
 * are taken implicitly from the currently visible schedule - the user
 * only supplies a name and optional description.
 * @param scenarioName - Name of the new scenario
 * @param description - Optional description of the new scenario
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal, TemplateRef, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { HttpErrorResponse } from '@angular/common/http';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';

@Component({
  selector: 'app-create-scenario-dialog',
  templateUrl: './create-scenario-dialog.component.html',
  styleUrls: ['./create-scenario-dialog.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateScenarioDialogComponent {
  readonly modalTemplate = viewChild.required<TemplateRef<unknown>>('createScenarioModal');

  private ngbModal = inject(NgbModal);
  private analyseScenarioService = inject(AnalyseScenarioService);
  private dataManagement = inject(DataManagementScheduleService);
  private groupSelection = inject(GroupSelectionService);
  private translate = inject(TranslateService);
  private modalRef: NgbModalRef | null = null;

  scenarioName = signal('');
  description = signal('');
  isSaving = signal(false);
  errorMessage = signal<string | null>(null);

  isValid = computed(() => this.scenarioName().trim().length > 0);

  open(): void {
    this.scenarioName.set('');
    this.description.set('');
    this.isSaving.set(false);
    this.errorMessage.set(null);

    this.modalRef = this.ngbModal.open(this.modalTemplate(), {
      centered: true,
      backdrop: 'static',
      size: 'md',
    });
  }

  onConfirm(): void {
    if (!this.isValid() || this.isSaving()) return;
    this.errorMessage.set(null);

    const start = this.dataManagement.visibleStartDate;
    const end = this.dataManagement.visibleEndDate;
    if (!start || !end) {
      this.errorMessage.set(this.translate.instant('scenario.error.noDateRange'));
      return;
    }

    const groupId = this.groupSelection.selectedGroup?.id;
    const fromDate = this.toIsoDate(start);
    const untilDate = this.toIsoDate(end);

    this.isSaving.set(true);

    this.analyseScenarioService.createScenario({
      name: this.scenarioName().trim(),
      description: this.description().trim() || undefined,
      groupId,
      fromDate,
      untilDate,
    }).subscribe({
      next: () => {
        this.modalRef?.close();
        this.isSaving.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const backendMessage = typeof err?.error === 'string' ? err.error : err?.message;
        this.errorMessage.set(
          this.translate.instant('scenario.error.createFailed', {
            status: err?.status ?? '',
            message: backendMessage ?? '',
          }),
        );
        this.isSaving.set(false);
      },
    });
  }

  onCancel(): void {
    this.modalRef?.close();
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
