// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';

import { ErpDropPointsComponent } from './erp-drop-points.component';
import { DataManagementErpDropPointService } from 'src/app/domain/services/settings/data-management-erp-drop-point.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { AssetDownloadService } from 'src/app/application/services/asset-download.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { CompanyClockService } from 'src/app/domain/services/settings/company-clock.service';
import { ErpImportScheduleDefaults } from 'src/app/domain/constants/erp-import-schedule.constants';
import { setCompanyTimeZone } from 'src/app/domain/helpers/calendar-date.helper';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { KlacksyTargetRequestedEvent } from 'src/app/domain/events/klacksy-target-requested-event.interface';
import { IErpDropPoint } from 'src/app/domain/models/settings/erp-drop-point';
import { IErpDropPointFiles } from 'src/app/domain/models/settings/erp-drop-point-files.interface';
import { IErpImportFile } from 'src/app/domain/models/settings/erp-import-file';
import { ErpImportFileStatus } from 'src/app/domain/enums/erp-import-file-status.enum';
import { ErpImportChannel } from 'src/app/domain/enums/erp-import-channel.enum';
import { ERP_IMPORT_LIST_LIMITS, ERP_IMPORT_POLLING } from 'src/app/domain/constants/erp-import-file.constants';
import { APP_PORT_BINDINGS } from 'src/app/app.port-bindings';

const importFile = (id: string, status: ErpImportFileStatus): IErpImportFile => ({
  id,
  fileName: `${id}.xml`,
  sizeBytes: 1,
  status,
  channel: ErpImportChannel.UiUpload,
  uploadedBy: null,
  receivedAt: '2026-10-19T08:00:00Z',
  startedAt: null,
  finishedAt: null,
  processedOrders: 0,
  totalOrders: null,
  newCount: 0,
  updatedCount: 0,
  unchangedCount: 0,
  supersededCount: 0,
  rejectedCount: 0,
  failureReason: null,
  duplicateOfReceivedAt: null,
  rejectedOrders: [],
});

const LISTING: IErpDropPointFiles = {
  inbox: [importFile('waiting', ErpImportFileStatus.Received)],
  processed: [importFile('done', ErpImportFileStatus.Completed), importFile('warned', ErpImportFileStatus.CompletedWithWarnings)],
  failed: [importFile('broken', ErpImportFileStatus.Failed), importFile('stale', ErpImportFileStatus.Interrupted)],
};

const EMPTY_LISTING: IErpDropPointFiles = { inbox: [], processed: [], failed: [] };

const dropPoint = (isEnabled: boolean): IErpDropPoint => ({
  id: 'dp-1',
  name: 'Default',
  sourceSystemId: 'default',
  bucketPrefix: '',
  isEnabled,
});

describe('ErpDropPointsComponent', () => {
  let component: ErpDropPointsComponent;
  let fixture: ComponentFixture<ErpDropPointsComponent>;
  let mockAppSettingsService: {
    loadSettingsAsync: ReturnType<typeof vi.fn>;
    erpImportCronExpression: ReturnType<typeof signal<string>>;
    erpImportCronTimeZone: ReturnType<typeof signal<string>>;
  };
  let mockCompanyClockService: { source: ReturnType<typeof signal<string | null>> };
  let targetRequests: Subject<KlacksyTargetRequestedEvent>;
  let mockDropPointService: {
    defaultDropPoint: ReturnType<typeof signal<IErpDropPoint | null>>;
    loadDefaultDropPoint: ReturnType<typeof vi.fn>;
    files: ReturnType<typeof signal<IErpDropPointFiles>>;
    loadFiles: ReturnType<typeof vi.fn>;
    requestPolling: ReturnType<typeof vi.fn>;
    resetFileTracking: ReturnType<typeof vi.fn>;
    retryFile: ReturnType<typeof vi.fn>;
    deleteFile: ReturnType<typeof vi.fn>;
    uploadFile: ReturnType<typeof vi.fn>;
    triggerImportRun: ReturnType<typeof vi.fn>;
    importPolling$: Subject<IErpDropPointFiles>;
  } & Record<string, unknown>;

  beforeEach(async () => {
    mockDropPointService = {
      defaultDropPoint: signal<IErpDropPoint | null>(null),
      files: signal<IErpDropPointFiles>(EMPTY_LISTING),
      isUploading: signal(false),
      isRetrying: signal(false),
      isDeleting: signal(false),
      isTriggeringImport: signal(false),
      loadDefaultDropPoint: vi.fn().mockResolvedValue(null),
      loadFiles: vi.fn().mockResolvedValue(EMPTY_LISTING),
      requestPolling: vi.fn(),
      resetFileTracking: vi.fn(),
      retryFile: vi.fn().mockResolvedValue(true),
      deleteFile: vi.fn().mockResolvedValue(true),
      uploadFile: vi.fn().mockResolvedValue('erp/orders/key-orders.xml'),
      triggerImportRun: vi.fn().mockResolvedValue(true),
      importPolling$: new Subject<IErpDropPointFiles>(),
    };

    mockAppSettingsService = {
      loadSettingsAsync: vi.fn().mockResolvedValue(undefined),
      erpImportCronExpression: signal(ErpImportScheduleDefaults.CronExpression),
      erpImportCronTimeZone: signal(ErpImportScheduleDefaults.UseCompanyTimeZone),
    };

    mockCompanyClockService = { source: signal<string | null>(null) };
    targetRequests = new Subject<KlacksyTargetRequestedEvent>();

    const mockManualLoaderService = { loadManual: vi.fn().mockReturnValue(of('')) };
    const mockAssetDownloadService = { downloadAsset: vi.fn().mockReturnValue(of(undefined)) };
    const mockModalService = { openModal: vi.fn() };
    const mockTranslateService = {
      instant: vi.fn((key: string) => key),
      get: vi.fn((key: string) => of(key)),
      currentLang: 'en',
      defaultLang: 'en',
      onLangChange: of({ lang: 'en' }),
      onTranslationChange: of({}),
      onDefaultLangChange: of({}),
    };

    await TestBed.configureTestingModule({
      imports: [ErpDropPointsComponent],
      providers: [
        ...APP_PORT_BINDINGS,
        { provide: DataManagementErpDropPointService, useValue: mockDropPointService },
        { provide: AppSettingsManagementService, useValue: mockAppSettingsService },
        { provide: ManualLoaderService, useValue: mockManualLoaderService },
        { provide: AssetDownloadService, useValue: mockAssetDownloadService },
        { provide: ModalService, useValue: mockModalService },
        { provide: TranslateService, useValue: mockTranslateService },
        { provide: CompanyClockService, useValue: mockCompanyClockService },
        { provide: EVENT_BUS_TOKEN, useValue: { on: vi.fn(() => targetRequests.asObservable()), emit: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ErpDropPointsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    setCompanyTimeZone(null);
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('keeps an explicitly chosen cron time zone instead of the company-zone default', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.onScheduleTimeZoneChange('America/New_York');
    fixture.detectChanges();

    expect(mockAppSettingsService.erpImportCronTimeZone()).toBe('America/New_York');
  });

  it('stores an empty cron time zone (company zone) instead of falling back to Europe/Zurich', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.onScheduleTimeZoneChange('America/New_York');
    fixture.detectChanges();
    component.onScheduleTimeZoneChange('');
    fixture.detectChanges();

    expect(mockAppSettingsService.erpImportCronTimeZone()).toBe('');
    expect(mockAppSettingsService.erpImportCronTimeZone()).not.toBe('Europe/Zurich');
  });

  it('shows the UTC warning when the company clock source is Utc', () => {
    mockCompanyClockService.source.set('Utc');
    fixture.detectChanges();

    expect(component.showUtcWarning()).toBe(true);
  });

  it('hides the UTC warning for a resolved company time zone', () => {
    mockCompanyClockService.source.set('Setting');
    fixture.detectChanges();

    expect(component.showUtcWarning()).toBe(false);
  });

  it('shows the UTC warning when the company clock source is UtcMultiZoneCountry', () => {
    mockCompanyClockService.source.set('UtcMultiZoneCountry');
    fixture.detectChanges();

    expect(component.showUtcWarning()).toBe(true);
  });

  it('includes the resolved company zone in the company-time-zone option label', () => {
    setCompanyTimeZone('Asia/Kolkata');
    fixture.detectChanges();

    expect(component.companyTimeZoneOptionLabel()).toContain('Asia/Kolkata');
  });
  it('switches to the import tab when Klacksy points at the upload zone from the handbook tab', () => {
    component.setTab('manual');

    targetRequests.next({ target: 'erp-drop-points-upload-zone' });

    expect(component.activeTab()).toBe('list');
  });

  it('switches to the handbook tab when Klacksy points at the sample download', () => {
    targetRequests.next({ target: 'erp-drop-points-download-sample-btn' });

    expect(component.activeTab()).toBe('manual');
  });

  it('keeps the current tab for targets outside the card tabs', () => {
    component.setTab('manual');

    targetRequests.next({ target: 'erp-drop-points' });

    expect(component.activeTab()).toBe('manual');
  });

  describe('import file list', () => {
    it.each([
      ['inbox', LISTING.inbox],
      ['processed', LISTING.processed],
      ['failed', LISTING.failed],
    ] as const)('shows the %s rows of the listing in that tab', (tab, expected) => {
      // Arrange
      mockDropPointService.files.set(LISTING);

      // Act
      component.setFileTab(tab);

      // Assert
      expect(component.visibleFiles()).toEqual(expected);
    });

    it('starts on the inbox tab', () => {
      expect(component.fileTab()).toBe('inbox');
    });

    const loadWithDropPoint = (isEnabled: boolean): void => {
      mockDropPointService.loadDefaultDropPoint.mockResolvedValue(dropPoint(isEnabled));
    };

    it('resets the finished-import tracking before the first listing and continues polling when files are pending', async () => {
      // Arrange
      loadWithDropPoint(true);
      mockDropPointService.loadFiles.mockResolvedValue(LISTING);

      // Act
      fixture.detectChanges();
      await fixture.whenStable();

      // Assert
      expect(mockDropPointService.resetFileTracking.mock.invocationCallOrder[0]).toBeLessThan(
        mockDropPointService.loadFiles.mock.invocationCallOrder[0],
      );
      expect(mockDropPointService.loadFiles).toHaveBeenCalledTimes(1);
      expect(mockDropPointService.requestPolling).toHaveBeenCalledTimes(1);
      expect(mockDropPointService.requestPolling).toHaveBeenCalledWith({ skipImmediateFetch: true });
    });

    it('does not poll on page load when the import is disabled, although files are pending', async () => {
      // Arrange
      loadWithDropPoint(false);
      mockDropPointService.loadFiles.mockResolvedValue(LISTING);

      // Act
      fixture.detectChanges();
      await fixture.whenStable();

      // Assert
      expect(mockDropPointService.requestPolling).not.toHaveBeenCalled();
    });

    it('does not poll when nothing is pending', async () => {
      // Arrange
      loadWithDropPoint(true);
      mockDropPointService.loadFiles.mockResolvedValue({ ...LISTING, inbox: [] });

      // Act
      fixture.detectChanges();
      await fixture.whenStable();

      // Assert
      expect(mockDropPointService.requestPolling).not.toHaveBeenCalled();
    });

    it('refreshes with one listing request and continues polling without a second immediate fetch', async () => {
      // Arrange
      mockDropPointService.defaultDropPoint.set(dropPoint(true));
      mockDropPointService.loadFiles.mockResolvedValue(LISTING);

      // Act
      await component.onRefreshFiles();

      // Assert
      expect(mockDropPointService.loadFiles).toHaveBeenCalledTimes(1);
      expect(mockDropPointService.requestPolling).toHaveBeenCalledWith({ skipImmediateFetch: true });
    });

    it('retries by ledger id and polls when the API accepted the retry', async () => {
      // Arrange
      mockDropPointService.defaultDropPoint.set(dropPoint(true));
      mockDropPointService.retryFile.mockResolvedValue(true);

      // Act
      await component.onRetryFile(LISTING.failed[0]);

      // Assert
      expect(mockDropPointService.retryFile).toHaveBeenCalledWith('broken');
      expect(mockDropPointService.requestPolling).toHaveBeenCalledWith({ graceMs: 0 });
      expect(mockDropPointService.loadFiles).not.toHaveBeenCalled();
    });

    it('reloads the list instead of polling when the retry was refused', async () => {
      // Arrange
      mockDropPointService.defaultDropPoint.set(dropPoint(true));
      mockDropPointService.retryFile.mockResolvedValue(false);

      // Act
      await component.onRetryFile(LISTING.failed[0]);

      // Assert
      expect(mockDropPointService.requestPolling).not.toHaveBeenCalled();
      expect(mockDropPointService.loadFiles).toHaveBeenCalledTimes(1);
    });

    it('starts polling after an upload so the new row shows up as importing', async () => {
      // Arrange
      mockDropPointService.defaultDropPoint.set(dropPoint(true));
      const file = new File(['<ErpOrderImport />'], 'orders.xml', { type: 'application/xml' });

      // Act
      await component.onDropZoneFiles({ 0: file, length: 1, item: () => file } as unknown as FileList);

      // Assert
      expect(mockDropPointService.uploadFile).toHaveBeenCalledWith(file);
      expect(mockDropPointService.requestPolling).toHaveBeenCalledTimes(1);
    });

    it('does not poll after an upload while the import is disabled (nothing would import it)', async () => {
      // Arrange
      mockDropPointService.defaultDropPoint.set(dropPoint(false));
      const file = new File(['<ErpOrderImport />'], 'orders.xml', { type: 'application/xml' });

      // Act
      await component.onDropZoneFiles({ 0: file, length: 1, item: () => file } as unknown as FileList);

      // Assert
      expect(mockDropPointService.uploadFile).toHaveBeenCalledWith(file);
      expect(mockDropPointService.requestPolling).not.toHaveBeenCalled();
    });

    it('still polls after an upload when the drop point could not be loaded (the import may well be enabled)', async () => {
      // Arrange
      mockDropPointService.defaultDropPoint.set(null);
      const file = new File(['<ErpOrderImport />'], 'orders.xml', { type: 'application/xml' });

      // Act
      await component.onDropZoneFiles({ 0: file, length: 1, item: () => file } as unknown as FileList);

      // Assert
      expect(mockDropPointService.requestPolling).toHaveBeenCalledWith({ graceMs: 0 });
    });

    it('does not poll when the upload failed', async () => {
      // Arrange
      mockDropPointService.defaultDropPoint.set(dropPoint(true));
      mockDropPointService.uploadFile.mockResolvedValue(null);
      const file = new File(['x'], 'orders.xml');

      // Act
      await component.onDropZoneFiles({ 0: file, length: 1, item: () => file } as unknown as FileList);

      // Assert
      expect(mockDropPointService.requestPolling).not.toHaveBeenCalled();
    });

    it('starts polling with the run-start grace period after a manual import run', async () => {
      // Arrange
      mockDropPointService.defaultDropPoint.set(dropPoint(true));

      // Act
      await component.onRunImport();

      // Assert
      expect(mockDropPointService.requestPolling).toHaveBeenCalledWith({ graceMs: ERP_IMPORT_POLLING.RUN_START_GRACE_MS });
    });

    it.each([
      [ERP_IMPORT_LIST_LIMITS.PROCESSED_LISTING_CAP, true],
      [ERP_IMPORT_LIST_LIMITS.PROCESSED_LISTING_CAP - 1, false],
    ])('shows the "newest only" hint in the processed tab for %i rows: %s', async (rowCount, isHintShown) => {
      // Arrange
      const processed = Array.from({ length: rowCount }, (_, i) => importFile(`done-${i}`, ErpImportFileStatus.Completed));
      mockDropPointService.files.set({ ...EMPTY_LISTING, processed });
      fixture.detectChanges();
      await fixture.whenStable();

      // Act
      component.setFileTab('processed');
      fixture.detectChanges();

      // Assert
      const hint = (fixture.nativeElement as HTMLElement).querySelector('#erp-drop-points-files-processed-cap-hint');
      expect(hint !== null).toBe(isHintShown);
    });

    it('exposes the file list as a table with column headers and an empty row spanning all columns', async () => {
      // Arrange / Act
      fixture.detectChanges();
      await fixture.whenStable();
      component.setFileTab('failed');
      fixture.detectChanges();

      // Assert
      const element = fixture.nativeElement as HTMLElement;
      expect(element.querySelector('#erp-drop-points-files-table')?.getAttribute('role')).toBe('table');
      expect(element.querySelector('#erp-drop-points-files-header-row')?.getAttribute('role')).toBe('row');
      expect(element.querySelectorAll('#erp-drop-points-files-header-row [role="columnheader"]').length).toBe(7);
      expect(element.querySelector('#erp-drop-points-files-table-body')?.getAttribute('role')).toBe('rowgroup');
      expect(element.querySelector('#erp-drop-points-files-empty-row [role="cell"]')?.getAttribute('aria-colspan')).toBe('7');
    });
  });
});
