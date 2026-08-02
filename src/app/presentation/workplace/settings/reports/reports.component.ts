// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Lists all report templates and handles creating, duplicating and deleting them.
 * @param reportRows - Rendered rows, used to open the modal of a freshly created template
 * @param pendingOpenReport - Template whose modal opens as soon as its row exists
 */

import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject, DestroyRef, AfterViewInit, viewChildren, effect } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { ReportRowComponent } from './report-row/report-row.component';
import { ReportHeaderComponent } from './report-header/report-header.component';
import { DataManagementReportService } from 'src/app/domain/services/report/data-management-report.service';
import { ReportPdfService } from 'src/app/domain/services/report/report-pdf.service';
import { ReportService } from 'src/app/domain/services/report/report.service';
import { ReportDataProviderService } from 'src/app/domain/services/report/report-data-provider.service';
import { ReportTemplate, ReportType } from 'src/app/domain/models/report/report-template.model';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { deleteConfirmations } from 'src/app/presentation/shared/modal/delete-confirmation.helper';
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

const REPORT_TOAST_NAME = 'report-template';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    SettingsListCardComponent,
    ReportHeaderComponent,
    ReportRowComponent,
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

  message = DomainMessages.DELETE_ENTRY;
  private pendingOpenReport: ReportTemplate | null = null;

  constructor() {
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
      .subscribe((id) => {
        this.deleteReport(id);
        this.modalService.componentContext = '';
        this.modalService.Filing = '';
        this.cdr.markForCheck();
      });
  }

  onClickAdd(): void {
    const template = this.dataManagementReportService.createDefaultTemplate(
      ReportType.Schedule,
      this.translate.instant('setting.report.defaultName')
    );
    template.isLocal = true;

    this.pendingOpenReport = template;
    this.dataManagementReportService.reportTemplateList.update(list => [...list, template]);
  }

  cancelNewReport(index: number): void {
    const report = this.dataManagementReportService.reportTemplateList()[index];
    if (report?.isLocal) {
      this.removeAt(index);
    }
  }

  async duplicateReport(index: number): Promise<void> {
    const report = this.dataManagementReportService.reportTemplateList()[index];
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

  openDeleteReport(index: number): void {
    const reports = this.dataManagementReportService.reportTemplateList();

    if (index >= 0 && index < reports.length) {
      this.modalService.Filing = '';
      this.modalService.componentContext = 'reports';
      this.modalService.Filing = index.toString();
      this.modalService.deleteMessage = this.message;
      this.modalService.setDefault(ModalType.Delete);
      this.modalService.openModel(ModalType.Delete);
    }
  }

  private async deleteReport(indexStr: string): Promise<void> {
    const index = parseInt(indexStr, 10);
    const reports = this.dataManagementReportService.reportTemplateList();

    if (index < 0 || index >= reports.length) {
      return;
    }

    const report = reports[index];
    if (!report) {
      return;
    }

    if (report.isLocal || !report.id) {
      this.removeAt(index);
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

  private removeAt(index: number): void {
    this.dataManagementReportService.reportTemplateList.update(list =>
      list.filter((_, i) => i !== index)
    );
  }

  private showError(messageKey: string): void {
    this.toast.showError(this.translate.instant(messageKey), REPORT_TOAST_NAME);
  }
}
