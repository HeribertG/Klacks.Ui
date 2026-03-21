// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Modal-Dialog zum Erstellen eines neuen Was-wäre-wenn Szenarios.
 * @param scenarioName - Name des neuen Szenarios
 * @param fromDate - Startdatum des Szenario-Zeitraums
 * @param untilDate - Enddatum des Szenario-Zeitraums
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal, TemplateRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';

@Component({
  selector: 'app-create-scenario-dialog',
  templateUrl: './create-scenario-dialog.component.html',
  standalone: true,
  imports: [FormsModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateScenarioDialogComponent {
  @ViewChild('createScenarioModal') modalTemplate!: TemplateRef<unknown>;

  private ngbModal = inject(NgbModal);
  private analyseScenarioService = inject(AnalyseScenarioService);
  private dataManagement = inject(DataManagementScheduleService);
  private groupSelection = inject(GroupSelectionService);
  private modalRef: NgbModalRef | null = null;

  scenarioName = signal('');
  description = signal('');
  fromDate = signal('');
  untilDate = signal('');
  isSaving = signal(false);

  isValid = computed(() => this.scenarioName().trim().length > 0 && this.fromDate() !== '' && this.untilDate() !== '');

  open(): void {
    this.scenarioName.set('');
    this.description.set('');
    this.isSaving.set(false);

    const start = this.dataManagement.visibleStartDate;
    const end = this.dataManagement.visibleEndDate;
    if (start) this.fromDate.set(start.toISOString().split('T')[0]);
    if (end) this.untilDate.set(end.toISOString().split('T')[0]);

    this.modalRef = this.ngbModal.open(this.modalTemplate, {
      centered: true,
      backdrop: 'static',
      size: 'md',
    });
  }

  onConfirm(): void {
    if (!this.isValid() || this.isSaving()) return;

    const groupId = this.groupSelection.selectedGroup?.id;
    if (!groupId) return;

    this.isSaving.set(true);

    this.analyseScenarioService.createScenario({
      name: this.scenarioName().trim(),
      description: this.description().trim() || undefined,
      groupId,
      fromDate: this.fromDate(),
      untilDate: this.untilDate(),
    }).subscribe({
      next: () => {
        this.modalRef?.close();
        this.isSaving.set(false);
      },
      error: () => {
        this.isSaving.set(false);
      },
    });
  }

  onCancel(): void {
    this.modalRef?.close();
  }
}
