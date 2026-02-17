/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, EventEmitter, Input, Output, TemplateRef, ViewChild, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef, NgbModule, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { ReportTemplate, ReportType, ReportOrientation, DEFAULT_PAGE_SETUP } from 'src/app/domain/models/report/report-template.model';
import { ReportService } from 'src/app/domain/services/report/report.service';
import { DataManagementReportService } from 'src/app/domain/services/report/data-management-report.service';
import { ReportPdfService, ReportGenerationContext } from 'src/app/domain/services/report/report-pdf.service';
import { ReportDataProviderService } from 'src/app/domain/services/report/report-data-provider.service';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { DataClientService, IClientForReplacement } from 'src/app/infrastructure/api/client/data-client.service';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { ReportDesignerComponent } from '../report-designer/report-designer.component';
import { DEFAULT_SECTIONS, ReportSectionType } from 'src/app/domain/models/report/report-section.model';
import { Group } from 'src/app/domain/models/group/group-class';
import { REPORT_DATA_SOURCES, ReportDataSource, ReportDataSet } from 'src/app/domain/models/report/report-data-source.model';
import { DateInputComponent } from 'src/app/presentation/shared/date-input/date-input.component';
import { transformDateToNgbDateStruct, transformNgbDateStructToDate } from 'src/app/shared/helpers/ngb-date.helper';

@Component({
  selector: 'app-report-row',
  templateUrl: './report-row.component.html',
  styleUrls: ['./report-row.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule, NgbModule, ReportDesignerComponent, DateInputComponent]
})
export class ReportRowComponent implements OnDestroy {
  @ViewChild('content', { static: true }) contentTemplate!: TemplateRef<unknown>;
  @Input() data!: ReportTemplate;
  @Input() id!: string;
  @Output() isDeleteEvent = new EventEmitter<void>();
  @Output() cancelNewEvent = new EventEmitter<void>();
  @Output() reportChangedEvent = new EventEmitter<void>();

  translate = inject(TranslateService);
  private http = inject(HttpClient);
  private modalService = inject(NgbModal);
  private reportService = inject(ReportService);
  private dataManagementReportService = inject(DataManagementReportService);
  private reportPdfService = inject(ReportPdfService);
  private dataProviderService = inject(ReportDataProviderService);
  private groupService = inject(DataManagementGroupService);
  private clientService = inject(DataClientService);

  private modalRef: NgbModalRef | null = null;
  private destroy$ = new Subject<void>();
  manualContent = signal('');

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
  imageCache = new Map<string, string>();

  availableSources = REPORT_DATA_SOURCES;
  editSourceId = 'schedule';
  editDataSetIds: string[] = ['work'];
  editMergeRows = false;
  editShowFullPeriod = false;

  previewGroupId = '';
  previewClientId = '';
  previewClients: IClientForReplacement[] = [];
  previewFromDate: NgbDateStruct | null = null;
  previewToDate: NgbDateStruct | null = null;
  isGenerating = false;

  get selectedSource(): ReportDataSource | undefined {
    return this.availableSources.find(s => s.id === this.editSourceId);
  }

  get selectedSourceDataSets(): ReportDataSet[] {
    return this.selectedSource?.dataSets ?? [];
  }

  get isNew(): boolean {
    return (this.data as any).isDirty === CreateEntriesEnum.new || (this.data as any).isLocal;
  }

  get groups(): Group[] {
    return this.groupService.flatNodeList ?? [];
  }

  ReportOrientation = ReportOrientation;

  get sourcePreviewConfig(): { needsGroup: boolean; needsDateRange: boolean; needsClient: boolean } {
    switch (this.editSourceId) {
      case 'schedule': return { needsGroup: false, needsDateRange: true, needsClient: false };
      case 'absence-gantt': return { needsGroup: false, needsDateRange: true, needsClient: true };
      case 'all-address': return { needsGroup: false, needsDateRange: false, needsClient: false };
      case 'edit-address': return { needsGroup: false, needsDateRange: false, needsClient: false };
      case 'group': return { needsGroup: false, needsDateRange: false, needsClient: false };
      case 'shift-table': return { needsGroup: false, needsDateRange: false, needsClient: false };
      case 'container-template': return { needsGroup: false, needsDateRange: false, needsClient: false };
      default: return { needsGroup: false, needsDateRange: true, needsClient: false };
    }
  }

  get canGeneratePreview(): boolean {
    if (this.isGenerating) return false;
    const config = this.sourcePreviewConfig;
    if (config.needsGroup && !this.previewGroupId) return false;
    if (config.needsDateRange && (!this.previewFromDate || !this.previewToDate)) return false;
    return true;
  }

  selectSource(source: ReportDataSource): void {
    this.editSourceId = source.id;
    this.editDataSetIds = [source.dataSets[0].id];
    this.resetTemplateSections();
  }

  toggleDataSet(ds: ReportDataSet): void {
    if (!this.selectedSource?.multiSelect) {
      this.editDataSetIds = [ds.id];
      this.resetTemplateSections();
      return;
    }
    const idx = this.editDataSetIds.indexOf(ds.id);
    if (idx >= 0 && this.editDataSetIds.length > 1) {
      this.editDataSetIds = this.editDataSetIds.filter(id => id !== ds.id);
    } else if (idx < 0) {
      this.editDataSetIds = [...this.editDataSetIds, ds.id];
    }
    this.updateTemplateDataSetIds();
  }

  private updateTemplateDataSetIds(): void {
    this.editTemplate = {
      ...this.editTemplate,
      dataSetIds: [...this.editDataSetIds],
    };
  }

  openModal(): void {
    this.editName = this.data.name;
    this.editDescription = this.data.description;
    this.editOrientation = this.data.pageSetup?.orientation ?? ReportOrientation.Landscape;
    this.editSourceId = this.data.sourceId || 'schedule';
    this.editMergeRows = this.data.mergeRows ?? false;
    this.editShowFullPeriod = this.data.showFullPeriod ?? false;
    this.editDataSetIds = this.data.dataSetIds?.length
      ? [...this.data.dataSetIds]
      : [(this.data as any).dataSetId || 'work'];
    this.editTemplate = {
      ...this.data,
      sourceId: this.editSourceId,
      dataSetIds: this.editDataSetIds,
      pageSetup: this.data.pageSetup || { ...DEFAULT_PAGE_SETUP },
      sections: this.data.sections?.length ? this.data.sections : [...DEFAULT_SECTIONS]
    };

    const today = new Date();
    this.previewFromDate = transformDateToNgbDateStruct(new Date(today.getFullYear(), today.getMonth(), 1)) ?? null;
    this.previewToDate = transformDateToNgbDateStruct(new Date(today.getFullYear(), today.getMonth() + 1, 0)) ?? null;

    if (this.groups.length === 0) {
      this.groupService.initTree();
    }

    this.loadPreviewClients();
    this.loadManual();

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

  async saveReport(closeAfterSave = false): Promise<void> {
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
        sourceId: this.editSourceId,
        dataSetIds: [...this.editDataSetIds],
        mergeRows: this.editMergeRows,
        showFullPeriod: this.editShowFullPeriod,
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

      if (closeAfterSave && this.modalRef) {
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
    if (!this.canGeneratePreview) return;

    this.isGenerating = true;
    const fromDate = transformNgbDateStructToDate(this.previewFromDate ?? undefined)?.toISOString().split('T')[0];
    const toDate = transformNgbDateStructToDate(this.previewToDate ?? undefined)?.toISOString().split('T')[0];

    try {
      const provider = this.dataProviderService.getProvider(this.editSourceId, this.editDataSetIds);
      const data = await provider.fetchData({
        groupId: this.previewGroupId || undefined,
        startDate: fromDate || undefined,
        endDate: toDate || undefined,
        clientId: this.previewClientId || undefined,
      });

      const selectedGroup = this.groups.find(g => g.id === this.previewGroupId);

      const pdfContext: ReportGenerationContext = {
        template: {
          ...this.editTemplate,
          name: this.editName.trim(),
          sourceId: this.editSourceId,
          dataSetIds: [...this.editDataSetIds],
          mergeRows: this.editMergeRows,
          showFullPeriod: this.editShowFullPeriod,
          pageSetup: {
            ...this.editTemplate.pageSetup,
            orientation: this.editOrientation
          }
        },
        provider,
        data,
        groupName: selectedGroup?.name ?? '',
        startDate: data.metadata?.['startDate'] ?? fromDate,
        endDate: data.metadata?.['endDate'] ?? toDate,
        imageCache: this.imageCache,
      };

      const blob = await this.reportPdfService.generatePdf(pdfContext);
      this.reportService.openPdfPreview(blob);
    } catch (err) {
      console.error('Error generating preview:', err);
    } finally {
      this.isGenerating = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadManual(): void {
    const lang = this.translate.currentLang || 'de';
    const supportedLangs = ['de', 'en', 'fr', 'it'];
    const effectiveLang = supportedLangs.includes(lang) ? lang : 'de';

    this.http
      .get(`assets/docs/report-manual/${effectiveLang}.html`, { responseType: 'text' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (content) => {
          this.manualContent.set(content);
        },
        error: () => {
          this.http
            .get('assets/docs/report-manual/de.html', { responseType: 'text' })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (content) => {
                this.manualContent.set(content);
              },
              error: () => {
                this.manualContent.set('<p>Manual not available</p>');
              },
            });
        },
      });
  }

  private loadPreviewClients(): void {
    if (this.previewClients.length > 0) return;
    this.clientService.getClientsForReplacement()
      .pipe(takeUntil(this.destroy$))
      .subscribe(clients => this.previewClients = clients);
  }

  private resetTemplateSections(): void {
    this.editTemplate = {
      ...this.editTemplate,
      sourceId: this.editSourceId,
      dataSetIds: [...this.editDataSetIds],
      sections: [
        { type: ReportSectionType.Header, fields: [], visible: true, sortOrder: 0 },
        { type: ReportSectionType.WorkTable, fields: [], visible: true, sortOrder: 1 },
        { type: ReportSectionType.Footer, fields: [], visible: true, sortOrder: 2 },
      ]
    };
  }

}
