// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * One row of the report template list, including the edit modal with general settings,
 * data source, designer, preview and manual.
 * @param data - Report template shown in this row
 * @param id - DOM id prefix of the row
 */

import { Component, ChangeDetectionStrategy, ChangeDetectorRef, TemplateRef, inject, input, output, signal, viewChild, DestroyRef } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgbModal, NgbModalRef, NgbModule, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReportTemplate, ReportTemplateVersion, ReportType, ReportOrientation, ReportPageSize, ReportMargins, DEFAULT_PAGE_SETUP } from 'src/app/domain/models/report/report-template.model';
import { ReportService } from 'src/app/domain/services/report/report.service';
import { DataManagementReportService } from 'src/app/domain/services/report/data-management-report.service';
import { ReportDefaultsService } from 'src/app/domain/services/report/report-defaults.service';
import { ReportTemplateTransferService } from 'src/app/domain/services/report/report-template-transfer.service';
import { ReportTemplateResolverService } from 'src/app/domain/services/report/report-template-resolver.service';
import { ReportCsvService } from 'src/app/domain/services/report/report-csv.service';
import { ReportPdfService, ReportGenerationContext } from 'src/app/domain/services/report/report-pdf.service';
import { ReportDataProviderService, ReportData, ReportDataProvider } from 'src/app/domain/services/report/report-data-provider.service';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { DataClientService, IClientForReplacement } from 'src/app/infrastructure/api/client/data-client.service';
import { ReportDesignerComponent } from '../report-designer/report-designer.component';
import { DEFAULT_SECTIONS, ReportSectionType } from 'src/app/domain/models/report/report-section.model';
import { Group } from 'src/app/domain/models/group/group-class';
import { REPORT_DATA_SOURCES, ReportDataSource, ReportDataSet } from 'src/app/domain/models/report/report-data-source.model';
import { DateInputComponent } from 'src/app/presentation/shared/date-input/date-input.component';
import { transformDateToNgbDateStruct, transformNgbDateStructToDate } from 'src/app/shared/helpers/ngb-date.helper';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { IconCopyGreyComponent } from 'src/app/presentation/icons/icon-copy-grey.component';
import { DownloadIconComponent } from 'src/app/presentation/icons/download-icon.component';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { DataReportApiService } from 'src/app/infrastructure/api/report/data-report-api.service';

import { DomainMessages } from 'src/app/domain/constants/messages';

const REPORT_TOAST_NAME = 'report-template';
const DEFAULT_SOURCE_ID = 'schedule';
const DEFAULT_DATA_SET_ID = 'work';
const MARGIN_MIN = 0;
const MARGIN_MAX = 60;

interface SourcePreviewConfig {
  needsGroup: boolean;
  needsDateRange: boolean;
  needsClient: boolean;
}

const SOURCE_PREVIEW_CONFIGS: Readonly<Record<string, SourcePreviewConfig>> = {
  schedule: { needsGroup: false, needsDateRange: true, needsClient: false },
  'absence-gantt': { needsGroup: false, needsDateRange: true, needsClient: true },
  'all-address': { needsGroup: false, needsDateRange: false, needsClient: false },
  'edit-address': { needsGroup: false, needsDateRange: false, needsClient: false },
  group: { needsGroup: false, needsDateRange: false, needsClient: false },
  'shift-table': { needsGroup: false, needsDateRange: false, needsClient: false },
  'container-template': { needsGroup: false, needsDateRange: false, needsClient: false },
};

const FALLBACK_PREVIEW_CONFIG: SourcePreviewConfig = { needsGroup: false, needsDateRange: true, needsClient: false };

@Component({
  selector: 'app-report-row',
  templateUrl: './report-row.component.html',
  styleUrls: ['./report-row.component.scss'],
  standalone: true,
  imports: [TranslateModule, FormsModule, NgbModule, ReportDesignerComponent, DateInputComponent, TrashIconRedComponent, IconCopyGreyComponent, DownloadIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportRowComponent {
  readonly contentTemplate = viewChild.required<TemplateRef<unknown>>('content');
  readonly data = input.required<ReportTemplate>();
  readonly id = input.required<string>();
  readonly isDeleteEvent = output<void>();
  readonly cancelNewEvent = output<void>();
  readonly duplicateEvent = output<void>();

  translate = inject(TranslateService);
  private manualLoader = inject(ManualLoaderService);
  private modalService = inject(NgbModal);
  private reportService = inject(ReportService);
  private dataManagementReportService = inject(DataManagementReportService);
  private reportDefaults = inject(ReportDefaultsService);
  private transferService = inject(ReportTemplateTransferService);
  private templateResolver = inject(ReportTemplateResolverService);
  private csvService = inject(ReportCsvService);
  private reportPdfService = inject(ReportPdfService);
  private dataProviderService = inject(ReportDataProviderService);
  private groupService = inject(DataManagementGroupService);
  private clientService = inject(DataClientService);
  private sanitizer = inject(DomSanitizer);
  private toast = inject(ToastShowService);
  private reportApi = inject(DataReportApiService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  private modalRef: NgbModalRef | null = null;
  private previewUrl: string | null = null;
  private loadedManualLang: string | null = null;
  private savedSnapshot = '';
  showDiscardConfirm = signal(false);
  manualContent = signal('');
  previewSource = signal<SafeResourceUrl | null>(null);
  isSaving = signal(false);
  isGenerating = signal(false);
  isLoadingVersions = signal(false);
  versions = signal<ReportTemplateVersion[]>([]);

  editName = '';
  editDescription = '';
  editOrientation: ReportOrientation = ReportOrientation.Landscape;
  editMargins: ReportMargins = { ...DEFAULT_PAGE_SETUP.margins };
  readonly marginSides: (keyof ReportMargins)[] = ['top', 'bottom', 'left', 'right'];
  editIsDefault = false;
  editTemplate: ReportTemplate = {
    name: '',
    description: '',
    type: ReportType.Schedule,
    pageSetup: { ...DEFAULT_PAGE_SETUP },
    sections: [...DEFAULT_SECTIONS]
  };
  imageCache = new Map<string, string>();

  availableSources = REPORT_DATA_SOURCES;
  editSourceId = DEFAULT_SOURCE_ID;
  editDataSetIds: string[] = [DEFAULT_DATA_SET_ID];
  editPageSize: ReportPageSize = ReportPageSize.A4;

  previewGroupId = '';
  previewClientId = '';
  previewClients: IClientForReplacement[] = [];
  previewFromDate: NgbDateStruct | null = null;
  previewToDate: NgbDateStruct | null = null;

  ReportOrientation = ReportOrientation;
  ReportPageSize = ReportPageSize;

  get selectedSource(): ReportDataSource | undefined {
    return this.availableSources.find(s => s.id === this.editSourceId);
  }

  get selectedSourceDataSets(): ReportDataSet[] {
    return this.selectedSource?.dataSets ?? [];
  }

  get isNew(): boolean {
    if (this.editTemplate?.id) return false;
    return !!this.data().isLocal;
  }

  get groups(): Group[] {
    return this.groupService.flatNodeList ?? [];
  }

  get isNameValid(): boolean {
    return this.editName.trim().length > 0;
  }

  get sourceLabelKey(): string {
    const sourceId = this.data().sourceId || DEFAULT_SOURCE_ID;
    return REPORT_DATA_SOURCES.find(s => s.id === sourceId)?.i18nKey ?? '';
  }

  get isDefaultTemplate(): boolean {
    const template = this.data();
    if (!template.id) {
      return false;
    }
    const sourceId = template.sourceId || DEFAULT_SOURCE_ID;
    return this.reportDefaults.defaults()[sourceId] === template.id;
  }

  get changedAtLabel(): string {
    const raw = this.data().updatedAt ?? this.data().createdAt;
    if (!raw) {
      return '';
    }
    const date = raw instanceof Date ? raw : new Date(raw);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
  }

  onRowSpace(event: Event): void {
    event.preventDefault();
    this.openModal();
  }

  onDuplicateClick(event: Event): void {
    event.stopPropagation();
    this.duplicateReport();
  }

  onDeleteClick(event: Event): void {
    event.stopPropagation();
    this.deleteReport();
  }

  /**
   * Loads the stored snapshots on demand; the template list does not carry them.
   */
  async loadVersions(): Promise<void> {
    const id = this.editTemplate.id;
    if (!id || this.isLoadingVersions()) {
      return;
    }

    this.isLoadingVersions.set(true);
    try {
      const full = await this.reportApi.getTemplateById(id);
      this.versions.set([...(full.versions ?? [])].reverse());
    } catch {
      this.versions.set([]);
      this.toast.showError(this.translate.instant('setting.report.error.versions'), REPORT_TOAST_NAME);
    } finally {
      this.isLoadingVersions.set(false);
      this.cdr.markForCheck();
    }
  }

  /**
   * Copies a snapshot into the editor. Nothing is stored until the user saves.
   */
  restoreVersion(version: ReportTemplateVersion): void {
    this.editName = version.name;
    this.editOrientation = version.pageSetup?.orientation ?? this.editOrientation;
    this.editPageSize = version.pageSetup?.size ?? this.editPageSize;
    this.editMargins = { ...(version.pageSetup?.margins ?? this.editMargins) };
    this.editTemplate = {
      ...this.editTemplate,
      name: version.name,
      pageSetup: this.buildPageSetup(),
      sections: structuredClone(version.sections ?? []),
    };
    this.toast.showInfo(this.translate.instant('setting.report.versionRestored'), REPORT_TOAST_NAME);
    this.cdr.markForCheck();
  }

  formatVersionDate(version: ReportTemplateVersion): string {
    const date = new Date(version.savedAt);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
  }

  onExportClick(event: Event): void {
    event.stopPropagation();
    const template = this.data();
    this.reportService.downloadJson(
      this.transferService.toJson(template),
      this.transferService.buildFileName(template)
    );
  }

  get sourcePreviewConfig(): SourcePreviewConfig {
    return SOURCE_PREVIEW_CONFIGS[this.editSourceId] ?? FALLBACK_PREVIEW_CONFIG;
  }

  get canGeneratePreview(): boolean {
    if (this.isGenerating()) return false;
    const config = this.sourcePreviewConfig;
    if (config.needsGroup && !this.previewGroupId) return false;
    if (config.needsDateRange && (!this.previewFromDate || !this.previewToDate)) return false;
    return true;
  }

  selectSource(source: ReportDataSource): void {
    this.editSourceId = source.id;
    this.editDataSetIds = [source.dataSets[0].id];
    this.editIsDefault = this.reportDefaults.getDefaultTemplateId(this.editSourceId) === this.editTemplate.id;
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
    const template = this.data();
    this.editName = template.name;
    this.editDescription = template.description;
    this.editOrientation = template.pageSetup?.orientation ?? ReportOrientation.Landscape;
    this.editPageSize = template.pageSetup?.size ?? ReportPageSize.A4;
    this.editMargins = { ...(template.pageSetup?.margins ?? DEFAULT_PAGE_SETUP.margins) };
    this.editSourceId = template.sourceId || DEFAULT_SOURCE_ID;
    this.editDataSetIds = template.dataSetIds?.length ? [...template.dataSetIds] : [DEFAULT_DATA_SET_ID];
    this.editTemplate = {
      ...template,
      sourceId: this.editSourceId,
      dataSetIds: this.editDataSetIds,
      pageSetup: template.pageSetup || { ...DEFAULT_PAGE_SETUP },
      sections: template.sections?.length ? template.sections : [...DEFAULT_SECTIONS]
    };

    const today = new Date();
    this.previewFromDate = transformDateToNgbDateStruct(new Date(today.getFullYear(), today.getMonth(), 1)) ?? null;
    this.previewToDate = transformDateToNgbDateStruct(new Date(today.getFullYear(), today.getMonth() + 1, 0)) ?? null;

    if (this.groups.length === 0) {
      this.groupService.initTree();
    }

    this.loadDefaultsState();
    this.loadPreviewClients();
    this.loadManual();

    this.showDiscardConfirm.set(false);
    this.versions.set([]);
    this.savedSnapshot = this.buildSnapshot();

    this.modalRef = this.modalService.open(this.contentTemplate(), {
      size: 'xl',
      backdrop: 'static',
      keyboard: false
    });

    this.modalRef.result.then(
      () => this.onModalClosed(),
      () => {
        this.onModalClosed();
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

  get hasUnsavedChanges(): boolean {
    return this.buildSnapshot() !== this.savedSnapshot;
  }

  /**
   * Closes the modal, but asks first when the designer holds unsaved work.
   */
  requestClose(): void {
    if (this.hasUnsavedChanges) {
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

  private buildSnapshot(): string {
    return JSON.stringify({
      name: this.editName,
      description: this.editDescription,
      orientation: this.editOrientation,
      pageSize: this.editPageSize,
      margins: this.editMargins,
      sourceId: this.editSourceId,
      dataSetIds: this.editDataSetIds,
      isDefault: this.editIsDefault,
      mergeRows: this.editTemplate.mergeRows ?? false,
      showFullPeriod: this.editTemplate.showFullPeriod ?? false,
      sections: this.editTemplate.sections,
    });
  }

  onTemplateChange(template: ReportTemplate): void {
    this.editTemplate = template;
  }

  onPageSetupChange(): void {
    this.editTemplate = {
      ...this.editTemplate,
      pageSetup: this.buildPageSetup()
    };
  }

  onMarginChange(side: keyof ReportMargins, raw: number | string): void {
    const parsed = typeof raw === 'number' ? raw : parseInt(raw, 10);
    const value = Number.isNaN(parsed) ? DEFAULT_PAGE_SETUP.margins[side] : parsed;
    this.editMargins = {
      ...this.editMargins,
      [side]: Math.min(MARGIN_MAX, Math.max(MARGIN_MIN, value)),
    };
    this.onPageSetupChange();
  }

  async saveReport(closeAfterSave = false): Promise<void> {
    if (!this.isNameValid) {
      this.toast.showError(this.translate.instant('setting.report.error.nameRequired'), REPORT_TOAST_NAME);
      return;
    }

    this.isSaving.set(true);

    try {
      const updated: ReportTemplate = {
        ...this.editTemplate,
        name: this.editName.trim(),
        description: this.editDescription.trim(),
        type: this.templateResolver.resolveReportType(this.editSourceId, this.editTemplate.type),
        sourceId: this.editSourceId,
        dataSetIds: [...this.editDataSetIds],
        mergeRows: this.editTemplate.mergeRows,
        showFullPeriod: this.editTemplate.showFullPeriod,
        pageSetup: this.buildPageSetup()
      };

      if (this.isNew) {
        const created = await this.dataManagementReportService.addTemplate(updated);
        this.editTemplate = { ...this.editTemplate, id: created.id };
      } else {
        await this.dataManagementReportService.updateTemplate(updated);
      }

      await this.applyDefaultState();
      this.savedSnapshot = this.buildSnapshot();
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

  deleteReport(): void {
    this.isDeleteEvent.emit();
  }

  duplicateReport(): void {
    this.duplicateEvent.emit();
  }

  async generatePreview(): Promise<void> {
    if (!this.canGeneratePreview) return;

    this.isGenerating.set(true);

    try {
      const { provider, data, fromDate, toDate } = await this.fetchPreviewData();
      const selectedGroup = this.groups.find(g => g.id === this.previewGroupId);

      const pdfContext: ReportGenerationContext = {
        template: this.buildPreviewTemplate(),
        provider,
        data,
        groupName: selectedGroup?.name ?? '',
        startDate: data.metadata?.['startDate'] ?? fromDate,
        endDate: data.metadata?.['endDate'] ?? toDate,
        imageCache: this.imageCache,
      };

      const blob = await this.reportPdfService.generatePdf(pdfContext);
      this.showPreview(blob);
    } catch {
      this.toast.showError(this.translate.instant('setting.report.error.preview'), REPORT_TOAST_NAME);
    } finally {
      this.isGenerating.set(false);
      this.cdr.markForCheck();
    }
  }

  /**
   * Fetches the rows for the current preview parameters, shared by the PDF and CSV paths.
   */
  private async fetchPreviewData(): Promise<{
    provider: ReportDataProvider;
    data: ReportData;
    fromDate?: string;
    toDate?: string;
  }> {
    const fromDate = this.toLocalDateString(transformNgbDateStructToDate(this.previewFromDate ?? undefined));
    const toDate = this.toLocalDateString(transformNgbDateStructToDate(this.previewToDate ?? undefined));

    const provider = this.dataProviderService.getProvider(this.editSourceId, this.editDataSetIds);
    const data = await provider.fetchData({
      groupId: this.previewGroupId || undefined,
      startDate: fromDate || undefined,
      endDate: toDate || undefined,
      clientId: this.previewClientId || undefined,
    });

    return { provider, data, fromDate, toDate };
  }

  private buildPreviewTemplate(): ReportTemplate {
    return {
      ...this.editTemplate,
      name: this.editName.trim(),
      sourceId: this.editSourceId,
      dataSetIds: [...this.editDataSetIds],
      mergeRows: this.editTemplate.mergeRows,
      showFullPeriod: this.editTemplate.showFullPeriod,
      pageSetup: this.buildPageSetup(),
    };
  }

  /**
   * Exports the same data the preview would render, as CSV instead of PDF.
   */
  async exportCsv(): Promise<void> {
    if (!this.canGeneratePreview) return;

    this.isGenerating.set(true);
    try {
      const { provider, data } = await this.fetchPreviewData();
      const template = this.buildPreviewTemplate();
      const content = this.csvService.buildCsv(template, provider, data);
      this.reportService.downloadCsv(this.csvService.buildBlob(content), this.csvService.buildFileName(template));
    } catch {
      this.toast.showError(this.translate.instant('setting.report.error.export'), REPORT_TOAST_NAME);
    } finally {
      this.isGenerating.set(false);
      this.cdr.markForCheck();
    }
  }

  openPreviewInNewTab(): void {
    if (this.previewUrl) {
      window.open(this.previewUrl, '_blank');
    }
  }

  loadManual(): void {
    const lang = this.translate.currentLang || DomainMessages.DEFAULT_LANG;
    if (this.loadedManualLang === lang) {
      return;
    }
    this.loadedManualLang = lang;
    this.manualLoader.loadManual('report-manual', lang)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(content => this.manualContent.set(content));
  }

  private buildPageSetup() {
    return {
      ...this.editTemplate.pageSetup,
      orientation: this.editOrientation,
      size: this.editPageSize,
      margins: { ...this.editMargins },
    };
  }

  private showPreview(blob: Blob): void {
    this.clearPreview();
    this.previewUrl = this.reportService.createPreviewUrl(blob);
    this.previewSource.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.previewUrl));
  }

  private clearPreview(): void {
    this.reportService.revokePreviewUrl(this.previewUrl);
    this.previewUrl = null;
    this.previewSource.set(null);
  }

  private onModalClosed(): void {
    this.modalRef = null;
    this.clearPreview();
  }

  private loadDefaultsState(): void {
    const apply = () => {
      this.editIsDefault = !!this.editTemplate.id
        && this.reportDefaults.getDefaultTemplateId(this.editSourceId) === this.editTemplate.id;
      this.cdr.markForCheck();
    };

    if (this.reportDefaults.isLoaded()) {
      apply();
      return;
    }
    this.reportDefaults.load().then(apply).catch(() => undefined);
  }

  private async applyDefaultState(): Promise<void> {
    const templateId = this.editTemplate.id;
    if (!templateId) {
      return;
    }

    const current = this.reportDefaults.getDefaultTemplateId(this.editSourceId);
    if (this.editIsDefault && current !== templateId) {
      await this.reportDefaults.setDefault(this.editSourceId, templateId);
    } else if (!this.editIsDefault && current === templateId) {
      await this.reportDefaults.setDefault(this.editSourceId, null);
    }
  }

  private toLocalDateString(date: Date | undefined): string | undefined {
    if (!date) return undefined;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private loadPreviewClients(): void {
    if (this.previewClients.length > 0) return;
    this.clientService.getClientsForReplacement()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(clients => {
        this.previewClients = clients;
        this.cdr.markForCheck();
      });
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
