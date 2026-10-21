// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Downloads of one report row: the template itself as JSON, and the preview data as CSV or XLSX.
 * @param template - Template exported as the JSON file the header's import accepts
 */

import { ChangeDetectorRef, Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ReportTemplate } from 'src/app/domain/models/report/report-template.model';
import { ReportService } from 'src/app/domain/services/report/report.service';
import { ReportTemplateTransferService } from 'src/app/domain/services/report/report-template-transfer.service';
import { ReportCsvService } from 'src/app/domain/services/report/report-csv.service';
import { ReportXlsxService } from 'src/app/domain/services/report/report-xlsx.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { REPORT_TOAST_NAME } from '../report-row.constants';
import { ReportRowEditorStateService } from './report-row-editor-state.service';
import { ReportRowParametersService } from './report-row-parameters.service';
import { ReportRowPreviewService } from './report-row-preview.service';

@Injectable()
export class ReportRowExportService {
  private state = inject(ReportRowEditorStateService);
  private parameters = inject(ReportRowParametersService);
  private preview = inject(ReportRowPreviewService);
  private reportService = inject(ReportService);
  private transferService = inject(ReportTemplateTransferService);
  private csvService = inject(ReportCsvService);
  private xlsxService = inject(ReportXlsxService);
  private toast = inject(ToastShowService);
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  exportTemplate(template: ReportTemplate): void {
    try {
      const content = this.transferService.toJson(template);
      this.reportService.downloadJson(content, this.transferService.buildFileName(template));
      this.toast.showSuccess(this.translate.instant('setting.report.exported'), REPORT_TOAST_NAME);
    } catch {
      this.showExportError();
    }
  }

  /**
   * Exports the same data the preview would render, as CSV instead of PDF.
   */
  async exportCsv(): Promise<void> {
    await this.runExport(async () => {
      const { provider, data } = await this.preview.fetchPreviewData();
      const template = this.state.buildPreviewTemplate();
      const content = this.csvService.buildCsv(template, provider, data, this.parameters.parameterContext);
      this.preview.warnOnFilterError();
      this.reportService.downloadCsv(this.csvService.buildBlob(content), this.csvService.buildFileName(template));
    });
  }

  /**
   * Exports the same data as XLSX, rendered by the server.
   */
  async exportXlsx(): Promise<void> {
    await this.runExport(async () => {
      const { provider, data } = await this.preview.fetchPreviewData();
      const template = this.state.buildPreviewTemplate();
      const workbook = await this.xlsxService.renderWorkbook(template, provider, data, this.parameters.parameterContext);
      this.preview.warnOnFilterError();
      this.reportService.downloadXlsx(workbook.blob, workbook.fileName);
    });
  }

  private async runExport(exportData: () => Promise<void>): Promise<void> {
    if (!this.preview.canGeneratePreview || !this.parameters.hasAllRequiredParameters()) return;

    this.preview.isGenerating.set(true);
    try {
      await exportData();
    } catch {
      this.showExportError();
    } finally {
      this.preview.isGenerating.set(false);
      this.cdr.markForCheck();
    }
  }

  private showExportError(): void {
    this.toast.showError(this.translate.instant('setting.report.error.export'), REPORT_TOAST_NAME);
  }
}
