// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, inject, DestroyRef, ViewChildren, QueryList, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
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
})
export class ReportsComponent implements AfterViewInit {
  @ViewChildren(ReportRowComponent) reportRows!: QueryList<ReportRowComponent>;

  public translate = inject(TranslateService);
  public dataManagementReportService = inject(DataManagementReportService);
  private modalService = inject(ModalService);
  private destroyRef = inject(DestroyRef);

  message = DomainMessages.DELETE_ENTRY;
  private reportToDeleteIndex: number | null = null;
  private pendingOpenReport: ReportTemplate | null = null;

  ngAfterViewInit(): void {
    this.modalService.resultEvent
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((x: ModalType) => {
        if (
          x === ModalType.Delete &&
          this.modalService.componentContext === 'reports'
        ) {
          this.deleteReport(this.modalService.Filing);
          this.modalService.componentContext = '';
          this.modalService.Filing = '';
        }
      });

    this.reportRows.changes
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.pendingOpenReport !== null) {
          const row = this.reportRows.find(r => r.data === this.pendingOpenReport);
          if (row) {
            setTimeout(() => row.openModal(), 0);
          }
          this.pendingOpenReport = null;
        }
      });
  }

  async onClickAdd(): Promise<void> {
    const template = this.dataManagementReportService.createDefaultTemplate(ReportType.Schedule);
    (template as any).isDirty = CreateEntriesEnum.new;
    (template as any).isLocal = true; // Mark as not yet saved to server

    this.pendingOpenReport = template;
    this.dataManagementReportService.reportTemplateList.update(list => [...list, template]);
  }

  cancelNewReport(index: number): void {
    const reports = this.dataManagementReportService.reportTemplateList();
    const report = reports[index];
    if (report && (report as any).isDirty === CreateEntriesEnum.new && (report as any).isLocal) {
      this.dataManagementReportService.reportTemplateList.update(list =>
        list.filter((_, i) => i !== index)
      );
    }
  }

  onReportChanged(_index: number): void {
    // Trigger change detection if needed
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

    if (index >= 0 && index < reports.length) {
      const report = reports[index];

      if (report) {
        if ((report as any).isDirty === CreateEntriesEnum.new || (report as any).isLocal) {
          // Local only, just remove from list
          this.dataManagementReportService.reportTemplateList.update(list =>
            list.filter((_, i) => i !== index)
          );
        } else if (report.id) {
          // Delete from server
          try {
            await this.dataManagementReportService.deleteTemplate(report.id);
          } catch (err) {
            console.error('Failed to delete report:', err);
          }
        }
      }
    }
  }
}
