import { Component, EventEmitter, Input, Output, TemplateRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';

import { ReportTemplate, ReportType, ReportOrientation, DEFAULT_PAGE_SETUP } from 'src/app/domain/models/report/report-template.model';
import { ReportService } from 'src/app/domain/services/report/report.service';
import { DataManagementReportService } from 'src/app/domain/services/report/data-management-report.service';
import { ReportPdfService, ReportGenerationContext } from 'src/app/domain/services/report/report-pdf.service';
import { DataWorkScheduleService } from 'src/app/infrastructure/api/data-work-schedule.service';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { ReportDesignerComponent } from '../report-designer/report-designer.component';
import { DEFAULT_SECTIONS } from 'src/app/domain/models/report/report-section.model';
import { Group } from 'src/app/domain/models/group-class';

@Component({
  selector: 'app-report-row',
  templateUrl: './report-row.component.html',
  styleUrls: ['./report-row.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule, NgbModule, ReportDesignerComponent]
})
export class ReportRowComponent {
  @ViewChild('content', { static: true }) contentTemplate!: TemplateRef<unknown>;
  @Input() data!: ReportTemplate;
  @Input() id!: string;
  @Output() isDeleteEvent = new EventEmitter<void>();
  @Output() cancelNewEvent = new EventEmitter<void>();
  @Output() reportChangedEvent = new EventEmitter<void>();

  translate = inject(TranslateService);
  private modalService = inject(NgbModal);
  private reportService = inject(ReportService);
  private dataManagementReportService = inject(DataManagementReportService);
  private reportPdfService = inject(ReportPdfService);
  private workScheduleService = inject(DataWorkScheduleService);
  private groupService = inject(DataManagementGroupService);

  private modalRef: NgbModalRef | null = null;

  editName = '';
  editDescription = '';
  editOrientation: ReportOrientation = ReportOrientation.Landscape;
  editTemplate: ReportTemplate = {
    name: '',
    description: '',
    type: ReportType.Schedule,
    pageSetup: { ...DEFAULT_PAGE_SETUP },
    sections: [...DEFAULT_SECTIONS]
  };
  isSaving = false;

  previewGroupId = '';
  previewFromDate = '';
  previewToDate = '';
  isGenerating = false;

  get isNew(): boolean {
    return (this.data as any).isDirty === CreateEntriesEnum.new || (this.data as any).isLocal;
  }

  get groups(): Group[] {
    return this.groupService.flatNodeList ?? [];
  }

  ReportOrientation = ReportOrientation;

  openModal(): void {
    this.editName = this.data.name;
    this.editDescription = this.data.description;
    this.editOrientation = this.data.pageSetup?.orientation ?? ReportOrientation.Landscape;
    this.editTemplate = {
      ...this.data,
      pageSetup: this.data.pageSetup || { ...DEFAULT_PAGE_SETUP },
      sections: this.data.sections?.length ? this.data.sections : [...DEFAULT_SECTIONS]
    };

    const today = new Date();
    this.previewFromDate = this.formatDateForInput(new Date(today.getFullYear(), today.getMonth(), 1));
    this.previewToDate = this.formatDateForInput(new Date(today.getFullYear(), today.getMonth() + 1, 0));

    if (this.groups.length === 0) {
      this.groupService.initTree();
    }

    this.modalRef = this.modalService.open(this.contentTemplate, {
      size: 'xl',
      backdrop: 'static',
      keyboard: false
    });

    this.modalRef.result.then(
      () => {},
      () => {
        if (this.isNew) {
          this.cancelNewEvent.emit();
        }
      }
    );
  }

  closeModal(): void {
    if (this.modalRef) {
      this.modalRef.dismiss('Cancel click');
      this.modalRef = null;
    }
  }

  onTemplateChange(template: ReportTemplate): void {
    this.editTemplate = template;
  }

  onOrientationChange(): void {
    this.editTemplate = {
      ...this.editTemplate,
      pageSetup: {
        ...this.editTemplate.pageSetup,
        orientation: this.editOrientation
      }
    };
  }

  async saveReport(): Promise<void> {
    if (!this.editName.trim()) {
      return;
    }

    this.isSaving = true;

    try {
      const updated: ReportTemplate = {
        ...this.editTemplate,
        name: this.editName.trim(),
        description: this.editDescription.trim(),
        type: ReportType.Schedule,
        pageSetup: {
          ...this.editTemplate.pageSetup,
          orientation: this.editOrientation
        }
      };

      if (this.isNew) {
        await this.dataManagementReportService.addTemplate(updated);
      } else {
        await this.dataManagementReportService.updateTemplate(updated);
      }

      this.reportChangedEvent.emit();

      if (this.modalRef) {
        this.modalRef.close();
        this.modalRef = null;
      }
    } catch (err) {
      console.error('Failed to save report:', err);
    } finally {
      this.isSaving = false;
    }
  }

  deleteReport(): void {
    this.isDeleteEvent.emit();
  }

  async generatePreview(): Promise<void> {
    if (!this.previewGroupId || !this.previewFromDate || !this.previewToDate) {
      return;
    }

    this.isGenerating = true;

    try {
      const response = await firstValueFrom(
        this.workScheduleService.getWorkSchedule({
          startDate: this.previewFromDate,
          endDate: this.previewToDate,
          selectedGroup: this.previewGroupId,
          showEmployees: true,
          showExtern: true,
        })
      );

      const selectedGroup = this.groups.find(g => g.id === this.previewGroupId);

      const pdfContext: ReportGenerationContext = {
        template: {
          ...this.editTemplate,
          name: this.editName.trim(),
          pageSetup: {
            ...this.editTemplate.pageSetup,
            orientation: this.editOrientation
          }
        },
        clients: response.clients,
        entries: response.entries,
        groupName: selectedGroup?.name ?? '',
        startDate: response.startDate,
        endDate: response.endDate,
      };

      const blob = this.reportPdfService.generatePdf(pdfContext);
      this.reportService.openPdfPreview(blob);
    } catch (err) {
      console.error('Error generating preview:', err);
    } finally {
      this.isGenerating = false;
    }
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
