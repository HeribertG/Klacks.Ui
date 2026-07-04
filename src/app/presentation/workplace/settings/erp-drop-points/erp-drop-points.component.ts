// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings page for the automatically managed ERP drop point: the global import schedule with an
 * enable toggle and status line, an always-active upload drop zone, a file explorer over the drop
 * point content (pending, processed, error) and the push access token management, plus a manual
 * tab with the import handbook and a sample XML download.
 * @param activeTab - Currently visible page tab (import or manual)
 * @param fileTab - Currently visible file explorer tab (pending, processed or error)
 */

import {
  Component, ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  inject,
  ElementRef,
  viewChild,
  signal,
  computed,
  effect,
  ChangeDetectorRef,
} from '@angular/core';

import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { form, FormField, debounce } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { ErpDropPointTokensComponent } from './erp-drop-point-tokens/erp-drop-point-tokens.component';
import { DragDropFileUploadDirective } from 'src/app/presentation/directives/drag-drop-file-upload.directive';
import { ExpandableCardComponent } from 'src/app/presentation/shared/expandable-card/expandable-card.component';
import { IconRefreshGreyComponent } from 'src/app/presentation/icons/icon-refresh-grey.component';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { DataManagementErpDropPointService } from 'src/app/domain/services/settings/data-management-erp-drop-point.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { IErpDropPoint, IErpDropPointFile, IErpDropPointRequest } from 'src/app/domain/models/settings/erp-drop-point';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { ErpImportScheduleDefaults } from 'src/app/domain/constants/erp-import-schedule.constants';
import { isValidCronExpression } from 'src/app/domain/helpers/cron-expression.helper';
import { formatFileSize } from 'src/app/domain/helpers/file-size.helper';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { AssetDownloadService } from 'src/app/application/services/asset-download.service';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';

const ERP_IMPORT_MANUAL_NAME = 'erp-import-manual';
const SAMPLE_FILE_NAME = 'sample-erp-order-import.xml';
const SAMPLE_FILE_ASSET_PATH = `assets/docs/${ERP_IMPORT_MANUAL_NAME}/${SAMPLE_FILE_NAME}`;
const XML_MIME_TYPE = 'application/xml';

type PageTab = 'list' | 'manual';
type FileTab = 'pending' | 'processed' | 'error';

type ErpDropPointFileView = IErpDropPointFile & { errorReason?: string | null };

interface ErpImportScheduleFormModel {
  cronExpression: string;
}

type IntlWithSupportedValues = typeof Intl & {
  supportedValuesOf?: (key: string) => string[];
};

@Component({
  selector: 'app-erp-drop-points',
  standalone: true,
  imports: [
    FormsModule,
    FormField,
    TranslateModule,
    DatePipe,
    ErpDropPointTokensComponent,
    ExpandableCardComponent,
    IconRefreshGreyComponent,
    TrashIconRedComponent,
    DragDropFileUploadDirective,
  ],
  templateUrl: './erp-drop-points.component.html',
  styleUrls: ['./erp-drop-points.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErpDropPointsComponent implements OnInit, OnDestroy {
  readonly uploadFileInput = viewChild.required<ElementRef<HTMLInputElement>>('uploadFileInput');

  public translate = inject(TranslateService);
  public dropPointService = inject(DataManagementErpDropPointService);
  private appSettingsService = inject(AppSettingsManagementService);
  private manualLoaderService = inject(ManualLoaderService);
  private assetDownloadService = inject(AssetDownloadService);
  private modalService = inject(ModalService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  readonly activeTab = signal<PageTab>('list');
  readonly fileTab = signal<FileTab>('pending');
  readonly manualContent = signal<string>('');

  readonly visibleFiles = computed<ErpDropPointFileView[]>(() => {
    const files = this.dropPointService.files();
    switch (this.fileTab()) {
      case 'processed':
        return files.processed;
      case 'error':
        return files.error;
      default:
        return files.pending;
    }
  });

  public readonly timeZones: string[] = this.loadTimeZones();
  public selectedScheduleTimeZone = signal<string>(ErpImportScheduleDefaults.CronTimeZone);
  private isScheduleFormInitialized = false;

  private scheduleFormModel = signal<ErpImportScheduleFormModel>({
    cronExpression: ErpImportScheduleDefaults.CronExpression,
  });

  scheduleForm = form(this.scheduleFormModel, f => {
    debounce(f.cronExpression, 300);
  });

  public isScheduleCronValid = computed(() => {
    const value = this.scheduleFormModel().cronExpression?.trim();
    return !value || isValidCronExpression(value);
  });

  constructor() {
    effect(() => {
      const model = this.scheduleFormModel();
      const timeZone = this.selectedScheduleTimeZone();
      if (this.isScheduleFormInitialized) {
        const cronExpression = model.cronExpression?.trim() || ErpImportScheduleDefaults.CronExpression;
        if (isValidCronExpression(cronExpression)) {
          this.appSettingsService.erpImportCronExpression.set(cronExpression);
        }
        this.appSettingsService.erpImportCronTimeZone.set(
          timeZone?.trim() || ErpImportScheduleDefaults.CronTimeZone
        );
      }
    });
  }

  ngOnInit(): void {
    void this.dropPointService.loadDefaultDropPoint();
    void this.dropPointService.loadFiles();
    void this.initSchedule();
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.activeTab() === 'manual') {
          this.loadManual();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(tab: PageTab): void {
    this.activeTab.set(tab);
    if (tab === 'manual' && !this.manualContent()) {
      this.loadManual();
    }
  }

  setFileTab(tab: FileTab): void {
    this.fileTab.set(tab);
  }

  async onToggleImportEnabled(event: Event): Promise<void> {
    const dropPoint = this.dropPointService.defaultDropPoint();
    if (!dropPoint) {
      return;
    }
    const isEnabled = (event.target as HTMLInputElement).checked;
    const request: IErpDropPointRequest = this.buildUpdateRequest(dropPoint, isEnabled);
    await this.dropPointService.updateDropPoint(dropPoint.id, request);
    this.cdr.markForCheck();
  }

  async onRunImport(): Promise<void> {
    await this.dropPointService.triggerImportRun();
    this.cdr.markForCheck();
  }

  onDropZoneClick(): void {
    if (this.dropPointService.isUploading()) {
      return;
    }
    const input = this.uploadFileInput().nativeElement;
    input.value = '';
    input.click();
  }

  async onDropZoneFiles(files: FileList): Promise<void> {
    if (this.dropPointService.isUploading()) {
      return;
    }
    await this.uploadFiles(Array.from(files));
  }

  async onUploadFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }
    await this.uploadFiles([file]);
  }

  async onRefreshFiles(): Promise<void> {
    await this.dropPointService.loadFiles();
    this.cdr.markForCheck();
  }

  async onRetryFile(key: string): Promise<void> {
    if (this.dropPointService.isRetrying()) {
      return;
    }
    const success = await this.dropPointService.retryFile(key);
    if (success) {
      await this.dropPointService.loadFiles();
    }
    this.cdr.markForCheck();
  }

  onDeleteFile(file: ErpDropPointFileView): void {
    if (this.dropPointService.isDeleting()) {
      return;
    }
    this.modalService.openModal({
      type: ModalType.Delete,
      title: this.translate.instant('delete'),
      message: this.translate.instant('settings.erp-drop-points.files.confirm-delete', { name: file.fileName }),
      confirmText: this.translate.instant('button.delete'),
      cancelText: this.translate.instant('cancel'),
      onConfirm: () => void this.deleteFile(file.key),
    });
  }

  formatSize(sizeBytes: number): string {
    return formatFileSize(sizeBytes);
  }

  onDownloadSample(): void {
    this.assetDownloadService
      .downloadAsset(SAMPLE_FILE_ASSET_PATH, SAMPLE_FILE_NAME, XML_MIME_TYPE)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  onScheduleTimeZoneChange(timeZone: string): void {
    this.selectedScheduleTimeZone.set(timeZone);
  }

  private async uploadFiles(files: File[]): Promise<void> {
    const uploadedKeys: string[] = [];
    for (const file of files) {
      const key = await this.dropPointService.uploadFile(file);
      if (key) {
        uploadedKeys.push(key);
      }
    }
    if (uploadedKeys.length > 0) {
      await this.dropPointService.loadFiles();
      void this.dropPointService.watchProcessingResults(uploadedKeys);
    }
    this.cdr.markForCheck();
  }

  private async deleteFile(key: string): Promise<void> {
    const success = await this.dropPointService.deleteFile(key);
    if (success) {
      await this.dropPointService.loadFiles();
    }
    this.cdr.markForCheck();
  }

  private buildUpdateRequest(dropPoint: IErpDropPoint, isEnabled: boolean): IErpDropPointRequest {
    return {
      name: dropPoint.name,
      sourceSystemId: dropPoint.sourceSystemId,
      bucketPrefix: dropPoint.bucketPrefix,
      isEnabled,
    };
  }

  private loadManual(): void {
    const lang = this.translate.currentLang || this.translate.defaultLang || DomainMessages.DEFAULT_LANG;
    this.manualLoaderService.loadManual(ERP_IMPORT_MANUAL_NAME, lang)
      .pipe(takeUntil(this.destroy$))
      .subscribe(content => this.manualContent.set(content));
  }

  private async initSchedule(): Promise<void> {
    await this.appSettingsService.loadSettingsAsync();
    this.scheduleFormModel.set({
      cronExpression: this.appSettingsService.erpImportCronExpression(),
    });
    this.selectedScheduleTimeZone.set(this.appSettingsService.erpImportCronTimeZone());
    this.isScheduleFormInitialized = true;
  }

  private loadTimeZones(): string[] {
    try {
      return (Intl as IntlWithSupportedValues).supportedValuesOf?.('timeZone') ?? [];
    } catch {
      return [];
    }
  }
}
