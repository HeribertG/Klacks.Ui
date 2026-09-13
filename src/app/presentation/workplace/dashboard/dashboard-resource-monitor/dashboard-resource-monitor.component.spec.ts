// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { DashboardResourceMonitorComponent } from './dashboard-resource-monitor.component';
import { DataDashboardService } from 'src/app/infrastructure/api/data-dashboard.service';
import { DataCalendarSelectionService } from 'src/app/infrastructure/api/calendar/data-calendar-selection.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { WeekConfigurationService } from 'src/app/domain/services/settings/week-configuration.service';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { LocaleService } from 'src/app/application/services/locale.service';

const SEPTEMBER_SAMPLE_DATE = '2026-09-15';

describe('DashboardResourceMonitorComponent', () => {
  let component: DashboardResourceMonitorComponent;
  let fixture: ComponentFixture<DashboardResourceMonitorComponent>;
  let mockLocaleService: { getLocale: ReturnType<typeof vi.fn>; locale: ReturnType<typeof signal<string>> };

  beforeEach(async () => {
    const mockDataDashboardService = {
      getResourceMonitor: vi.fn().mockReturnValue(
        of({
          dailyData: [
            { date: SEPTEMBER_SAMPLE_DATE, dienstCount: 0, absenzCount: 0, wunschCount: 0, maxCount: 0, totalCount: 0 },
          ],
        })
      ),
    };
    const mockDataCalendarSelectionService = { getCalendarSelection: vi.fn().mockReturnValue(of(null)) };
    const mockAppSettingsService = {
      loadSettingsAsync: vi.fn().mockResolvedValue(undefined),
      contactSettings: signal({ globalCalendarSelectionId: null }),
    };
    const mockGridColorService = {
      isReset: signal(false),
      backGroundColor: '#f2eded',
      backGroundColorSaturday: '#F5F5DC',
      backGroundColorSunday: '#95b9d0',
      backGroundColorOfficiallyHoliday: '#48C9B0',
    };
    const mockWeekConfigurationService = { getWeekendSlot: vi.fn().mockReturnValue(null) };
    const mockHolidayCollectionService = {
      isReset: signal(false),
      currentYear: 2026,
      holidays: { holidayInfo: vi.fn().mockReturnValue(null) },
      readDataAsync: vi.fn().mockResolvedValue(undefined),
      setSelection: vi.fn(),
    };
    const mockManualLoaderService = { loadManual: vi.fn().mockReturnValue(of('')) };
    const mockTranslateService = {
      currentLang: 'en',
      onLangChange: of({ lang: 'en' }),
    };
    mockLocaleService = { getLocale: vi.fn().mockReturnValue('de'), locale: signal('de') };

    await TestBed.configureTestingModule({
      imports: [DashboardResourceMonitorComponent],
      providers: [
        { provide: DataDashboardService, useValue: mockDataDashboardService },
        { provide: DataCalendarSelectionService, useValue: mockDataCalendarSelectionService },
        { provide: AppSettingsManagementService, useValue: mockAppSettingsService },
        { provide: GridColorService, useValue: mockGridColorService },
        { provide: WeekConfigurationService, useValue: mockWeekConfigurationService },
        { provide: HolidayCollectionService, useValue: mockHolidayCollectionService },
        { provide: ManualLoaderService, useValue: mockManualLoaderService },
        { provide: TranslateService, useValue: mockTranslateService },
        { provide: LocaleService, useValue: mockLocaleService },
      ],
    })
      .overrideComponent(DashboardResourceMonitorComponent, { set: { imports: [], template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(DashboardResourceMonitorComponent);
    component = fixture.componentInstance;
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('formats the month marker label with the app locale, not the browser language', () => {
    component.ngOnInit();

    const expected = new Intl.DateTimeFormat('de', { calendar: 'gregory', numberingSystem: 'latn', month: 'short' }).format(
      new Date(SEPTEMBER_SAMPLE_DATE)
    );

    expect(component.monthMarkers()[0].label).toBe(expected);
    expect(mockLocaleService.getLocale).toHaveBeenCalled();
  });

  it('renders a non-numeric month label for the th locale', () => {
    mockLocaleService.getLocale.mockReturnValue('th');
    component.ngOnInit();

    const label = component.monthMarkers()[0].label;

    expect(label.length).toBeGreaterThan(0);
    expect(/^\d+$/.test(label)).toBe(false);
  });
});
