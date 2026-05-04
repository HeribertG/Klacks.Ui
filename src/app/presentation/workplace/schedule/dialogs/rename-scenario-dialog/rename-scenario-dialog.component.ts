// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Modal dialog for renaming an existing what-if scenario.
 * @param scenario - The scenario to rename, passed via open()
 * @param scenarioName - The new name entered by the user
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { HttpErrorResponse } from '@angular/common/http';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { IAnalyseScenario } from 'src/app/domain/models/schedule/analyse-scenario-class';

@Component({
  selector: 'app-rename-scenario-dialog',
  templateUrl: './rename-scenario-dialog.component.html',
  styleUrls: ['./rename-scenario-dialog.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RenameScenarioDialogComponent {
  @ViewChild('renameScenarioModal') modalTemplate!: TemplateRef<unknown>;

  private ngbModal = inject(NgbModal);
  private analyseScenarioService = inject(AnalyseScenarioService);
  private translate = inject(TranslateService);
  private modalRef: NgbModalRef | null = null;
  private scenarioId = signal<string | null>(null);

  scenarioName = signal('');
  isSaving = signal(false);
  errorMessage = signal<string | null>(null);

  isValid = computed(() => this.scenarioName().trim().length > 0);

  open(scenario: IAnalyseScenario): void {
    this.scenarioId.set(scenario.id);
    this.scenarioName.set(scenario.name);
    this.isSaving.set(false);
    this.errorMessage.set(null);

    this.modalRef = this.ngbModal.open(this.modalTemplate, {
      centered: true,
      backdrop: 'static',
      size: 'md',
    });
  }

  onConfirm(): void {
    const id = this.scenarioId();
    if (!this.isValid() || this.isSaving() || !id) return;
    this.errorMessage.set(null);
    this.isSaving.set(true);

    this.analyseScenarioService.renameScenario(id, this.scenarioName().trim()).subscribe({
      next: () => {
        this.modalRef?.close();
        this.isSaving.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const backendMessage = typeof err?.error === 'string' ? err.error : err?.message;
        this.errorMessage.set(
          this.translate.instant('scenario.error.renameFailed', {
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
}
