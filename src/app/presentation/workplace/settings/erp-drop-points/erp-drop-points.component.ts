// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Settings page for the automatically managed ERP drop point: the global import schedule with an
 * enable toggle and status line, an always-active upload drop zone, the import file list read from the
 * import ledger (inbox with progress, processed with per-file summary, failed with retry and delete) and the
 * push access token management, plus a manual tab with the import handbook and a sample XML download.
 * The page keeps the domain service's import polling subscribed for its lifetime and (re)starts it after an
 * upload, an accepted retry or a manual run unless the import is known to be disabled (a disabled import never picks
 * files up), and after loading or refreshing the listing only when the import is enabled and files are pending.
 * @param activeTab - Currently visible page tab (import or manual)
 * @param fileTab - Currently visible file list tab (inbox, processed or failed)
 * @param isProcessedListCapped - True when the processed tab shows as many rows as the API returns at most
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
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormsModule } from '@angular/forms';
import { form, FormField, debounce } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { ErpDropPointTokensComponent } from './erp-drop-point-tokens/erp-drop-point-tokens.component';
import { DragDropFileUploadDirective } from 'src/app/presentation/directives/drag-drop-file-upload.directive';
import { ExpandableCardComponent } from 'src/app/presentation/shared/expandable-card/expandable-card.component';
import { IconRefreshGreyComponent } from 'src/app/presentation/icons/icon-refresh-grey.component';
import { DataManagementErpDropPointService } from 'src/app/domain/services/settings/data-management-erp-drop-point.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { IErpDropPoint } from 'src/app/domain/models/settings/erp-drop-point';
import { IErpDropPointFiles } from 'src/app/domain/models/settings/erp-drop-point-files.interface';
import { IErpDropPointRequest } from 'src/app/domain/models/settings/erp-drop-point-request.interface';
import { IErpImportFile } from 'src/app/domain/models/settings/erp-import-file';
import { hasPendingErpImportFiles } from 'src/app/domain/helpers/erp-import-file.helper';
import {
  ERP_IMPORT_FILES_I18N,
  ERP_IMPORT_LIST_LIMITS,
  ERP_IMPORT_POLLING,
} from 'src/app/domain/constants/erp-import-file.constants';
import { CompanyDateTimePipe } from 'src/app/shared/pipes/company-date-time/company-date-time.pipe';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { ErpImportScheduleDefaults } from 'src/app/domain/constants/erp-import-schedule.constants';
import { isValidCronExpression } from 'src/app/domain/helpers/cron-expression.helper';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { AssetDownloadService } from 'src/app/application/services/asset-download.service';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { CompanyClockService } from 'src/app/domain/services/settings/company-clock.service';
import { isCompanyClockUtcFallback } from 'src/app/domain/models/settings/company-clock.model';
import { companyTimeZone } from 'src/app/shared/helpers/calendar-date.helper';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { KlacksyTargetRequestedEvent } from 'src/app/domain/events/klacksy-target-requested-event.interface';
import { ERP_DROP_POINTS_TAB_TARGETS, ErpDropPointsPageTab } from './erp-drop-points-target.constants';
import { ErpImportFilesTab, erpImportFilesColumnCount } from './erp-import-files-tab';
import { ErpImportScheduleFormModel } from './erp-import-schedule-form-model.interface';
import { ErpImportFileRowComponent } from './erp-import-file-row/erp-import-file-row.component';

const ERP_IMPORT_MANUAL_NAME = 'erp-import-manual';
const SAMPLE_FILE_NAME = 'sample-erp-order-import.xml';
const SAMPLE_FILE_ASSET_PATH = `assets/docs/${ERP_IMPORT_MANUAL_NAME}/${SAMPLE_FILE_NAME}`;
const XML_MIME_TYPE = 'application/xml';

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
    CompanyDateTimePipe,
    ErpDropPointTokensComponent,
    ErpImportFileRowComponent,
    ExpandableCardComponent,
    IconRefreshGreyComponent,
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
  private companyClockService = inject(CompanyClockService);
  private eventBus = inject(EVENT_BUS_TOKEN);
  private destroyRef = inject(DestroyRef);
  private destroy$ = new Subject<void>();

  public readonly showUtcWarning = computed(() => isCompanyClockUtcFallback(this.companyClockService.source()));

  public readonly companyTimeZoneOptionLabel = computed(() => {
    const zone = companyTimeZone();
    const label = this.translate.instant('settings.erp-drop-points.schedule.companyTimeZoneOption');
    return zone ? `${label} (${zone})` : label;
  });

  readonly activeTab = signal<ErpDropPointsPageTab>('list');
  readonly fileTab = signal<ErpImportFilesTab>('inbox');
  readonly manualContent = signal<string>('');

  readonly visibleFiles = computed<IErpImportFile[]>(() => this.dropPointService.files()[this.fileTab()]);
  readonly isProcessedListCapped = computed(
    () => this.dropPointService.files().processed.length >= ERP_IMPORT_LIST_LIMITS.PROCESSED_LISTING_CAP,
  );

  readonly columnCount = computed(() => erpImportFilesColumnCount(this.fileTab()));

  protected readonly i18n = ERP_IMPORT_FILES_I18N;
  protected readonly processedListingCap = ERP_IMPORT_LIST_LIMITS.PROCESSED_LISTING_CAP;

  public readonly timeZones: string[] = this.loadTimeZones();
  public selectedScheduleTimeZone = signal<string>(ErpImportScheduleDefaults.UseCompanyTimeZone);
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
    this.dropPointService.importPolling$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cdr.markForCheck());

    this.eventBus
      .on<KlacksyTargetRequestedEvent>(DomainEventType.KLACKSY_TARGET_REQUESTED)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ target }) => {
        const tab = ERP_DROP_POINTS_TAB_TARGETS[target];
        if (tab) {
          this.setTab(tab);
        }
      });

    effect(() => {
      const model = this.scheduleFormModel();
      const timeZone = this.selectedScheduleTimeZone();
      if (this.isScheduleFormInitialized) {
        const cronExpression = model.cronExpression?.trim() || ErpImportScheduleDefaults.CronExpression;
        if (isValidCronExpression(cronExpression)) {
          this.appSettingsService.erpImportCronExpression.set(cronExpression);
        }
        this.appSettingsService.erpImportCronTimeZone.set(timeZone?.trim() ?? ErpImportScheduleDefaults.UseCompanyTimeZone);
      }
    });
  }

  ngOnInit(): void {
    void this.initDropPointAndFiles();
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

  setTab(tab: ErpDropPointsPageTab): void {
    this.activeTab.set(tab);
    if (tab === 'manual' && !this.manualContent()) {
      this.loadManual();
    }
  }

  setFileTab(tab: ErpImportFilesTab): void {
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
    if (await this.dropPointService.triggerImportRun()) {
      this.requestPollingUnlessImportDisabled(ERP_IMPORT_POLLING.RUN_START_GRACE_MS);
    }
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
    await this.reloadFiles();
    this.cdr.markForCheck();
  }

  async onRetryFile(file: IErpImportFile): Promise<void> {
    if (this.dropPointService.isRetrying()) {
      return;
    }
    const isQueued = await this.dropPointService.retryFile(file.id);
    if (isQueued) {
      this.requestPollingUnlessImportDisabled();
    } else {
      await this.dropPointService.loadFiles();
    }
    this.cdr.markForCheck();
  }

  onDeleteFile(file: IErpImportFile): void {
    if (this.dropPointService.isDeleting()) {
      return;
    }
    this.modalService.openModal({
      type: ModalType.Delete,
      title: this.translate.instant('delete'),
      message: this.translate.instant(ERP_IMPORT_FILES_I18N.CONFIRM_DELETE, { name: file.fileName }),
      confirmText: this.translate.instant('button.delete'),
      cancelText: this.translate.instant('cancel'),
      onConfirm: () => void this.deleteFile(file.id),
    });
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
    let hasUploaded = false;
    for (const file of files) {
      if (await this.dropPointService.uploadFile(file)) {
        hasUploaded = true;
      }
    }
    if (hasUploaded) {
      this.requestPollingUnlessImportDisabled();
    }
    this.cdr.markForCheck();
  }

  private async deleteFile(id: string): Promise<void> {
    await this.dropPointService.deleteFile(id);
    await this.dropPointService.loadFiles();
    this.cdr.markForCheck();
  }

  private async initDropPointAndFiles(): Promise<void> {
    this.dropPointService.resetFileTracking();
    const [dropPoint, files] = await Promise.all([
      this.dropPointService.loadDefaultDropPoint(),
      this.dropPointService.loadFiles(),
    ]);
    this.continuePollingIfPending(files, dropPoint?.isEnabled === true);
  }

  private async reloadFiles(): Promise<void> {
    const files = await this.dropPointService.loadFiles();
    this.continuePollingIfPending(files, this.isImportEnabled());
  }

  private continuePollingIfPending(files: IErpDropPointFiles, isImportEnabled: boolean): void {
    if (isImportEnabled && hasPendingErpImportFiles(files)) {
      this.dropPointService.requestPolling({ skipImmediateFetch: true });
    }
  }

  private requestPollingUnlessImportDisabled(graceMs = 0): void {
    if (this.dropPointService.defaultDropPoint()?.isEnabled !== false) {
      this.dropPointService.requestPolling({ graceMs });
    }
  }

  private isImportEnabled(): boolean {
    return this.dropPointService.defaultDropPoint()?.isEnabled === true;
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
