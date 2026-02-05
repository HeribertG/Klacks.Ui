import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef, NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { ReportTemplate, ReportType } from 'src/app/domain/models/report/report-template.model';
import { ReportService } from 'src/app/domain/services/report/report.service';
import { DataManagementReportService } from 'src/app/domain/services/report/data-management-report.service';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';

@Component({
  selector: 'app-report-row',
  templateUrl: './report-row.component.html',
  styleUrls: ['./report-row.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule, NgbModule]
})
export class ReportRowComponent {
  @Input() data!: ReportTemplate;
  @Input() id!: string;
  @Output() isDeleteEvent = new EventEmitter<void>();
  @Output() cancelNewEvent = new EventEmitter<void>();
  @Output() reportChangedEvent = new EventEmitter<void>();

  public translate = inject(TranslateService);
  private modalService = inject(NgbModal);
  private reportService = inject(ReportService);
  private dataManagementReportService = inject(DataManagementReportService);

  private modalRef: NgbModalRef | null = null;

  // Edit form data
  editName = '';
  editDescription = '';
  editType: ReportType = ReportType.Schedule;
  isSaving = false;

  // Preview data
  previewClientId = '';
  previewFromDate: string = '';
  previewToDate: string = '';

  get isNew(): boolean {
    return (this.data as any).isDirty === CreateEntriesEnum.new || (this.data as any).isLocal;
  }

  get reportTypeLabel(): string {
    switch (this.data.type) {
      case ReportType.Schedule: return this.translate.instant('setting.report.type.schedule');
      case ReportType.Client: return this.translate.instant('setting.report.type.client');
      case ReportType.Invoice: return this.translate.instant('setting.report.type.invoice');
      case ReportType.Absence: return this.translate.instant('setting.report.type.absence');
      default: return '';
    }
  }

  openModal(): void {
    this.editName = this.data.name;
    this.editDescription = this.data.description;
    this.editType = this.data.type;

    // Set default preview dates
    const today = new Date();
    this.previewFromDate = this.formatDateForInput(new Date(today.getFullYear(), today.getMonth(), 1));
    this.previewToDate = this.formatDateForInput(new Date(today.getFullYear(), today.getMonth() + 1, 0));

    // Open modal using querySelector to find the template
    const modalElement = document.getElementById('reportModal-' + this.id);
    if (modalElement) {
      this.modalRef = this.modalService.open(modalElement, {
        size: 'lg',
        backdrop: 'static',
        keyboard: false
      });
    }
  }

  closeModal(): void {
    if (this.isNew) {
      this.cancelNewEvent.emit();
    }
    if (this.modalRef) {
      this.modalRef.close();
      this.modalRef = null;
    }
  }

  async saveReport(): Promise<void> {
    if (!this.editName.trim()) {
      return;
    }

    this.isSaving = true;

    try {
      const updated: ReportTemplate = {
        ...this.data,
        name: this.editName.trim(),
        description: this.editDescription.trim(),
        type: this.editType
      };

      if (this.isNew) {
        // Create new template
        await this.dataManagementReportService.addTemplate(updated);
      } else {
        // Update existing template
        await this.dataManagementReportService.updateTemplate(updated);
      }

      this.reportChangedEvent.emit();

      if (this.modalRef) {
        this.modalRef.close();
        this.modalRef = null;
      }
    } catch (err) {
      console.error('Failed to save report:', err);
      // TODO: Show error notification
    } finally {
      this.isSaving = false;
    }
  }

  deleteReport(): void {
    this.isDeleteEvent.emit();
  }

  generatePreview(): void {
    if (!this.previewClientId || !this.previewFromDate || !this.previewToDate) {
      return;
    }

    const fromDate = new Date(this.previewFromDate);
    const toDate = new Date(this.previewToDate);

    this.reportService.previewScheduleReport(this.previewClientId, fromDate, toDate)
      .subscribe({
        next: (blob: Blob) => {
          this.reportService.openPdfPreview(blob);
        },
        error: (err: unknown) => {
          console.error('Error generating preview:', err);
        }
      });
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
