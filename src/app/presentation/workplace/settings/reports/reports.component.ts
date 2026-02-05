import { Component, inject, ViewChildren, QueryList, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { ReportRowComponent } from './report-row/report-row.component';
import { ReportHeaderComponent } from './report-header/report-header.component';
import { DataManagementReportService } from 'src/app/domain/services/report/data-management-report.service';
import { ReportTemplate, ReportType } from 'src/app/domain/models/report/report-template.model';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';

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
    ReportRowComponent
  ]
})
export class ReportsComponent implements AfterViewInit, OnDestroy {
  @ViewChildren(ReportRowComponent) reportRows!: QueryList<ReportRowComponent>;

  public translate = inject(TranslateService);
  public dataManagementReportService = inject(DataManagementReportService);
  private modalService = inject(ModalService);
  private destroy$ = new Subject<void>();

  message = MessageLibrary.DELETE_ENTRY;
  private reportToDeleteIndex: number | null = null;
  private pendingOpenReport: ReportTemplate | null = null;

  ngAfterViewInit(): void {
    this.modalService.resultEvent
      .pipe(takeUntil(this.destroy$))
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
      .pipe(takeUntil(this.destroy$))
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onClickAdd(): void {
    const report: ReportTemplate = {
      name: MessageLibrary.NOT_DEFINED,
      description: '',
      type: ReportType.Schedule,
      pageSetup: {
        orientation: 1, // Landscape
        size: 0, // A4
        margins: { top: 20, bottom: 20, left: 20, right: 20 }
      },
      sections: []
    };
    (report as any).isDirty = CreateEntriesEnum.new;

    this.pendingOpenReport = report;
    this.dataManagementReportService.addTemplate(report);
  }

  cancelNewReport(index: number): void {
    const reports = this.dataManagementReportService.reportTemplateList();
    const report = reports[index];
    if (report && (report as any).isDirty === CreateEntriesEnum.new) {
      this.dataManagementReportService.reportTemplateList.update(list =>
        list.filter((_, i) => i !== index)
      );
    }
  }

  onReportChanged(index: number): void {
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

  private deleteReport(indexStr: string): void {
    const index = parseInt(indexStr, 10);
    const reports = this.dataManagementReportService.reportTemplateList();

    if (index >= 0 && index < reports.length) {
      const report = reports[index];

      if (report) {
        if ((report as any).isDirty === CreateEntriesEnum.new) {
          this.dataManagementReportService.reportTemplateList.update(list =>
            list.filter((_, i) => i !== index)
          );
        } else {
          this.dataManagementReportService.deleteTemplate(report.id!);
        }
      }
    }
  }
}
