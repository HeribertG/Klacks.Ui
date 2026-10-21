// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Preview tab of one report row: the preview filters, fetching the report data and rendering it as PDF
 * into an embedded preview.
 * @param previewGroupId - Group filter, empty for all groups
 * @param previewClientId - Client filter, empty for all clients
 * @param previewFromDate - First day of the previewed period
 * @param previewToDate - Last day of the previewed period
 */

import { ChangeDetectorRef, Injectable, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { Group } from 'src/app/domain/models/group/group-class';
import { companyToday } from 'src/app/domain/helpers/calendar-date.helper';
import { applyParameterBindings } from 'src/app/domain/helpers/report-parameter.helper';
import { ReportService } from 'src/app/domain/services/report/report.service';
import { ReportRowFilterService } from 'src/app/domain/services/report/report-row-filter.service';
import { ReportPdfService } from 'src/app/domain/services/report/report-pdf.service';
import { ReportGenerationContext } from 'src/app/domain/services/report/report-generation-context.interface';
import { ReportDataProviderService } from 'src/app/domain/services/report/report-data-provider.service';
import { ReportData } from 'src/app/domain/services/report/report-data.interface';
import { ReportDataProvider } from 'src/app/domain/services/report/report-data-provider.interface';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { transformDateToNgbDateStruct, transformNgbDateStructToDate } from 'src/app/presentation/helpers/ngb-date.helper';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { SourcePreviewConfig } from '../source-preview-config.interface';
import { FALLBACK_PREVIEW_CONFIG, PREVIEW_TAB_TARGET, REPORT_TOAST_NAME, SOURCE_PREVIEW_CONFIGS } from '../report-row.constants';
import { ReportRowEditorStateService } from './report-row-editor-state.service';
import { ReportRowParametersService } from './report-row-parameters.service';

@Injectable()
export class ReportRowPreviewService {
  private state = inject(ReportRowEditorStateService);
  private parameters = inject(ReportRowParametersService);
  private groupService = inject(DataManagementGroupService);
  private dataProviderService = inject(ReportDataProviderService);
  private reportPdfService = inject(ReportPdfService);
  private rowFilterService = inject(ReportRowFilterService);
  private reportService = inject(ReportService);
  private sanitizer = inject(DomSanitizer);
  private toast = inject(ToastShowService);
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  readonly previewSource = signal<SafeResourceUrl | null>(null);
  readonly isGenerating = signal(false);

  previewGroupId = '';
  previewClientId = '';
  previewFromDate: NgbDateStruct | null = null;
  previewToDate: NgbDateStruct | null = null;

  private previewUrl: string | null = null;

  get groups(): Group[] {
    return this.groupService.flatNodeList ?? [];
  }

  get sourcePreviewConfig(): SourcePreviewConfig {
    return SOURCE_PREVIEW_CONFIGS[this.state.editSourceId] ?? FALLBACK_PREVIEW_CONFIG;
  }

  get canGeneratePreview(): boolean {
    if (this.isGenerating()) return false;
    const config = this.sourcePreviewConfig;
    if (config.needsGroup && !this.previewGroupId) return false;
    if (config.needsDateRange && (!this.previewFromDate || !this.previewToDate)) return false;
    return true;
  }

  /**
   * Presets the period to the current company month and makes sure the group filter has its groups.
   */
  prepare(): void {
    const today = companyToday();
    this.previewFromDate = transformDateToNgbDateStruct(new Date(today.getFullYear(), today.getMonth(), 1)) ?? null;
    this.previewToDate = transformDateToNgbDateStruct(new Date(today.getFullYear(), today.getMonth() + 1, 0)) ?? null;

    if (this.groups.length === 0) {
      this.groupService.initTree();
    }
  }

  async generatePreview(): Promise<void> {
    if (!this.canGeneratePreview || !this.parameters.hasAllRequiredParameters()) return;

    this.isGenerating.set(true);

    try {
      const { provider, data, fromDate, toDate } = await this.fetchPreviewData();
      const selectedGroup = this.groups.find(g => g.id === this.previewGroupId);

      const pdfContext: ReportGenerationContext = {
        template: this.state.buildPreviewTemplate(),
        provider,
        data,
        groupName: selectedGroup?.name ?? '',
        startDate: data.metadata?.['startDate'] ?? fromDate,
        endDate: data.metadata?.['endDate'] ?? toDate,
        imageCache: this.state.imageCache,
        parameterValues: this.state.parameterValues,
      };

      const blob = await this.reportPdfService.generatePdf(pdfContext);
      this.warnOnFilterError();
      this.showPreview(blob);
    } catch {
      this.toast.showError(this.translate.instant('setting.report.error.preview'), REPORT_TOAST_NAME);
    } finally {
      this.isGenerating.set(false);
      this.cdr.markForCheck();
    }
  }

  /**
   * Fetches the rows for the current preview parameters, shared by the PDF, CSV and XLSX paths.
   */
  async fetchPreviewData(): Promise<{
    provider: ReportDataProvider;
    data: ReportData;
    fromDate?: string;
    toDate?: string;
  }> {
    const fromDate = this.toLocalDateString(transformNgbDateStructToDate(this.previewFromDate ?? undefined));
    const toDate = this.toLocalDateString(transformNgbDateStructToDate(this.previewToDate ?? undefined));

    const provider = this.dataProviderService.getProvider(this.state.editSourceId, this.state.editDataSetIds);
    const fetchParams = applyParameterBindings(this.state.editParameters, this.state.parameterValues, {
      groupId: this.previewGroupId || undefined,
      startDate: fromDate || undefined,
      endDate: toDate || undefined,
      clientId: this.previewClientId || undefined,
    });
    const data = await provider.fetchData(fetchParams);

    return { provider, data, fromDate, toDate };
  }

  /**
   * A filter expression that cannot be evaluated keeps every row, which would look like
   * a working report. Say so once instead.
   */
  warnOnFilterError(): void {
    if (this.rowFilterService.hadEvaluationError) {
      this.toast.showError(this.translate.instant('setting.report.error.rowFilter'), REPORT_TOAST_NAME);
    }
  }

  openPreviewInNewTab(): void {
    if (this.previewUrl) {
      window.open(this.previewUrl, PREVIEW_TAB_TARGET);
    }
  }

  clearPreview(): void {
    this.reportService.revokePreviewUrl(this.previewUrl);
    this.previewUrl = null;
    this.previewSource.set(null);
  }

  private showPreview(blob: Blob): void {
    this.clearPreview();
    this.previewUrl = this.reportService.createPreviewUrl(blob);
    this.previewSource.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.previewUrl));
  }

  private toLocalDateString(date: Date | undefined): string | undefined {
    if (!date) return undefined;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
