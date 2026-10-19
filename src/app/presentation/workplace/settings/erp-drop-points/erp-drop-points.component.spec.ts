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
import { setCompanyTimeZone } from 'src/app/shared/helpers/calendar-date.helper';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { KlacksyTargetRequestedEvent } from 'src/app/domain/events/domain-events';

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

  beforeEach(async () => {
    const mockDropPointService = {
      defaultDropPoint: signal(null),
      files: signal({ pending: [], processed: [], error: [] }),
      isUploading: signal(false),
      isRetrying: signal(false),
      isDeleting: signal(false),
      isTriggeringImport: signal(false),
      loadDefaultDropPoint: vi.fn().mockResolvedValue(null),
      loadFiles: vi.fn().mockResolvedValue(undefined),
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
});
