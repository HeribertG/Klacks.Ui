// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Lists all report templates and handles searching, creating, duplicating and deleting them.
 * @param reportRows - Rendered rows, used to open the modal of a freshly created template
 * @param searchTerm - Free text filter applied to name, description and data source
 */

import { Component, ChangeDetectionStrategy, ChangeDetectorRef, computed, inject, DestroyRef, AfterViewInit, signal, viewChildren, effect } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { ReportRowComponent } from './report-row/report-row.component';
import { ReportHeaderComponent } from './report-header/report-header.component';
import { IconFpImportComponent } from 'src/app/presentation/icons/icon-fp-import.component';
import { DataManagementReportService } from 'src/app/domain/services/report/data-management-report.service';
import { ReportPdfService } from 'src/app/domain/services/report/report-pdf.service';
import { ReportService } from 'src/app/domain/services/report/report.service';
import { ReportDataProviderService } from 'src/app/domain/services/report/report-data-provider.service';
import { ReportDefaultsService } from 'src/app/domain/services/report/report-defaults.service';
import { ReportTemplateTransferService } from 'src/app/domain/services/report/report-template-transfer.service';
import { ReportTemplate, ReportType } from 'src/app/domain/models/report/report-template.model';
import { REPORT_DATA_SOURCES } from 'src/app/domain/models/report/report-data-source.model';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { deleteConfirmations } from 'src/app/presentation/shared/modal/delete-confirmation.helper';
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

const REPORT_TOAST_NAME = 'report-template';
const DELETE_FILING_MARKER = 'pending';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    NgbTooltipModule,
    SettingsListCardComponent,
    ReportHeaderComponent,
    ReportRowComponent,
    IconFpImportComponent,
  ],
  providers: [
    DataManagementReportService,
    ReportPdfService,
    ReportService,
    ReportDataProviderService,
    AbsenceLookupService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsComponent implements AfterViewInit {
  readonly reportRows = viewChildren(ReportRowComponent);
  public dataManagementReportService = inject(DataManagementReportService);
  private modalService = inject(ModalService);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private translate = inject(TranslateService);
  private toast = inject(ToastShowService);
  private reportDefaults = inject(ReportDefaultsService);
  private transferService = inject(ReportTemplateTransferService);

  message = DomainMessages.DELETE_ENTRY;
  searchTerm = signal('');

  readonly visibleReports = computed(() => {
    const all = this.dataManagementReportService.reportTemplateList().filter(r => !r.isDeleted);
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return all;
    }
    return all.filter(report => this.buildSearchIndex(report).includes(term));
  });

  private pendingOpenReport: ReportTemplate | null = null;
  private reportToDelete: ReportTemplate | null = null;

  constructor() {
    this.reportDefaults.load().catch(() => undefined);

    effect(() => {
      const rowList = this.reportRows();
      if (this.pendingOpenReport !== null) {
        const row = rowList.find(r => r.data() === this.pendingOpenReport);
        if (row) {
          setTimeout(() => row.openModal(), 0);
        }
        this.pendingOpenReport = null;
        this.cdr.markForCheck();
      }
    });

    effect(() => {
      if (this.dataManagementReportService.error()) {
        this.showError('setting.report.error.load');
      }
    });
  }

  ngAfterViewInit(): void {
    deleteConfirmations(this.modalService, 'reports')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.deleteReport();
        this.modalService.componentContext = '';
        this.modalService.Filing = '';
        this.cdr.markForCheck();
      });
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term ?? '');
  }

  /**
   * Reads an exported template file and creates it as a new template.
   */
  async onImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    try {
      const template = this.transferService.parseJson(await file.text());
      await this.dataManagementReportService.addTemplate(template);
      this.toast.showSuccess(this.translate.instant('setting.report.imported'), REPORT_TOAST_NAME);
    } catch {
      this.showError('setting.report.error.import');
    } finally {
      this.cdr.markForCheck();
    }
  }

  onClickAdd(): void {
    const template = this.dataManagementReportService.createDefaultTemplate(
      ReportType.Schedule,
      this.translate.instant('setting.report.defaultName')
    );
    template.isLocal = true;

    this.searchTerm.set('');
    this.pendingOpenReport = template;
    this.dataManagementReportService.reportTemplateList.update(list => [...list, template]);
  }

  cancelNewReport(report: ReportTemplate): void {
    if (report?.isLocal) {
      this.remove(report);
    }
  }

  async duplicateReport(report: ReportTemplate): Promise<void> {
    if (!report || report.isLocal || !report.id) {
      return;
    }

    const copyName = this.translate.instant('setting.report.copyName', { name: report.name });
    try {
      await this.dataManagementReportService.duplicateTemplate(report, copyName);
      this.toast.showSuccess(this.translate.instant('setting.report.duplicated'), REPORT_TOAST_NAME);
    } catch {
      this.showError('setting.report.error.duplicate');
    } finally {
      this.cdr.markForCheck();
    }
  }

  openDeleteReport(report: ReportTemplate): void {
    if (!report) {
      return;
    }

    this.reportToDelete = report;
    this.modalService.componentContext = 'reports';
    this.modalService.Filing = DELETE_FILING_MARKER;
    this.modalService.deleteMessage = this.message;
    this.modalService.setDefault(ModalType.Delete);
    this.modalService.openModel(ModalType.Delete);
  }

  private async deleteReport(): Promise<void> {
    const report = this.reportToDelete;
    this.reportToDelete = null;
    if (!report) {
      return;
    }

    if (report.isLocal || !report.id) {
      this.remove(report);
      return;
    }

    try {
      await this.dataManagementReportService.deleteTemplate(report.id);
    } catch {
      this.showError('setting.report.error.delete');
    } finally {
      this.cdr.markForCheck();
    }
  }

  private remove(report: ReportTemplate): void {
    this.dataManagementReportService.reportTemplateList.update(list =>
      list.filter(entry => entry !== report)
    );
  }

  private buildSearchIndex(report: ReportTemplate): string {
    const sourceKey = REPORT_DATA_SOURCES.find(s => s.id === report.sourceId)?.i18nKey;
    const sourceLabel = sourceKey ? this.translate.instant(sourceKey) : '';
    return `${report.name} ${report.description} ${sourceLabel}`.toLowerCase();
  }

  private showError(messageKey: string): void {
    this.toast.showError(this.translate.instant(messageKey), REPORT_TOAST_NAME);
  }
}
