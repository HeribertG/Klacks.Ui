// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Modal dialog for confirming deletion of all what-if scenarios for a group.
 * @param groupId - Optional group ID passed via open(), scopes the bulk delete
 */

import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { HttpErrorResponse } from '@angular/common/http';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';

@Component({
  selector: 'app-delete-all-scenarios-dialog',
  templateUrl: './delete-all-scenarios-dialog.component.html',
  styleUrls: ['./delete-all-scenarios-dialog.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteAllScenariosDialogComponent {
  @ViewChild('deleteAllScenariosModal') modalTemplate!: TemplateRef<unknown>;

  private ngbModal = inject(NgbModal);
  private analyseScenarioService = inject(AnalyseScenarioService);
  private translate = inject(TranslateService);
  private modalRef: NgbModalRef | null = null;
  private groupId = signal<string | undefined>(undefined);

  isDeleting = signal(false);
  errorMessage = signal<string | null>(null);

  open(groupId?: string): void {
    this.groupId.set(groupId);
    this.isDeleting.set(false);
    this.errorMessage.set(null);

    this.modalRef = this.ngbModal.open(this.modalTemplate, {
      centered: true,
      backdrop: 'static',
      size: 'md',
    });
  }

  onConfirm(): void {
    if (this.isDeleting()) return;
    this.errorMessage.set(null);
    this.isDeleting.set(true);

    this.analyseScenarioService.deleteAllScenarios(this.groupId()).subscribe({
      next: () => {
        this.modalRef?.close();
        this.isDeleting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const backendMessage = typeof err?.error === 'string' ? err.error : err?.message;
        this.errorMessage.set(
          this.translate.instant('scenario.deleteAll.error', {
            status: err?.status ?? '',
            message: backendMessage ?? '',
          }),
        );
        this.isDeleting.set(false);
      },
    });
  }

  onCancel(): void {
    this.modalRef?.close();
  }
}
