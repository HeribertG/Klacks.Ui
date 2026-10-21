// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Edit session of one report row: opens and closes the modal, asks before unsaved work is discarded
 * and stores the template.
 * @param content - Modal content template of the row
 * @param onCancelNew - Called when the modal of a not yet stored template is dismissed
 * @param closeAfterSave - Whether the modal closes once the template is stored
 */

import { ChangeDetectorRef, Injectable, TemplateRef, inject, signal } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ReportTemplate } from 'src/app/domain/models/report/report-template.model';
import { DataManagementReportService } from 'src/app/domain/services/report/data-management-report.service';
import { ReportTemplateResolverService } from 'src/app/domain/services/report/report-template-resolver.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { MODAL_DISMISS_REASON, REPORT_MODAL_OPTIONS, REPORT_TOAST_NAME } from '../report-row.constants';
import { ReportRowEditorStateService } from './report-row-editor-state.service';
import { ReportRowParametersService } from './report-row-parameters.service';
import { ReportRowPreviewService } from './report-row-preview.service';
import { ReportRowSourceService } from './report-row-source.service';

@Injectable()
export class ReportRowSessionService {
  private state = inject(ReportRowEditorStateService);
  private sources = inject(ReportRowSourceService);
  private parameters = inject(ReportRowParametersService);
  private preview = inject(ReportRowPreviewService);
  private dataManagementReportService = inject(DataManagementReportService);
  private templateResolver = inject(ReportTemplateResolverService);
  private modalService = inject(NgbModal);
  private toast = inject(ToastShowService);
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  readonly showDiscardConfirm = signal(false);
  readonly isSaving = signal(false);

  private modalRef: NgbModalRef | null = null;

  open(content: TemplateRef<unknown>, onCancelNew: () => void): void {
    this.showDiscardConfirm.set(false);
    this.state.markSaved();

    this.modalRef = this.modalService.open(content, REPORT_MODAL_OPTIONS);

    this.modalRef.result.then(
      () => this.onModalClosed(),
      () => {
        this.onModalClosed();
        if (this.state.isNew) {
          onCancelNew();
        }
      }
    );
  }

  closeModal(): void {
    if (this.modalRef) {
      this.modalRef.dismiss(MODAL_DISMISS_REASON);
      this.modalRef = null;
    }
  }

  /**
   * Closes the modal, but asks first when the designer holds unsaved work.
   */
  requestClose(): void {
    if (this.state.hasUnsavedChanges) {
      this.showDiscardConfirm.set(true);
      return;
    }
    this.closeModal();
  }

  discardChanges(): void {
    this.showDiscardConfirm.set(false);
    this.closeModal();
  }

  keepEditing(): void {
    this.showDiscardConfirm.set(false);
  }

  async saveReport(closeAfterSave = false): Promise<void> {
    if (!this.state.isNameValid) {
      this.toast.showError(this.translate.instant('setting.report.error.nameRequired'), REPORT_TOAST_NAME);
      return;
    }

    if (!this.parameters.hasValidParameterKeys()) {
      return;
    }

    this.isSaving.set(true);

    try {
      await this.storeTemplate(this.buildSavedTemplate());
      await this.sources.applyDefaultState();
      this.state.markSaved();
      this.toast.showSuccess(this.translate.instant('setting.report.saved'), REPORT_TOAST_NAME);

      if (closeAfterSave && this.modalRef) {
        this.modalRef.close();
        this.modalRef = null;
      }
    } catch {
      this.toast.showError(this.translate.instant('setting.report.error.save'), REPORT_TOAST_NAME);
    } finally {
      this.isSaving.set(false);
      this.cdr.markForCheck();
    }
  }

  private buildSavedTemplate(): ReportTemplate {
    const state = this.state;
    return {
      ...state.editTemplate,
      name: state.editName.trim(),
      description: state.editDescription.trim(),
      type: this.templateResolver.resolveReportType(state.editSourceId, state.editTemplate.type),
      sourceId: state.editSourceId,
      dataSetIds: [...state.editDataSetIds],
      mergeRows: state.editTemplate.mergeRows,
      showFullPeriod: state.editTemplate.showFullPeriod,
      pageSetup: state.buildPageSetup(),
      parameters: [...state.editParameters],
    };
  }

  private async storeTemplate(updated: ReportTemplate): Promise<void> {
    if (this.state.isNew) {
      const created = await this.dataManagementReportService.addTemplate(updated);
      this.state.editTemplate = { ...this.state.editTemplate, id: created.id };
    } else {
      await this.dataManagementReportService.updateTemplate(updated);
    }
  }

  private onModalClosed(): void {
    this.modalRef = null;
    this.preview.clearPreview();
  }
}
