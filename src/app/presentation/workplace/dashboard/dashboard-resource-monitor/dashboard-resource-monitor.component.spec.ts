// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
import { HolidaysListHelper } from 'src/app/domain/models/calendar/calendar-rule-class';
import {
  OFFICIAL_AND_REMINDER_ORDERINGS,
  OFFICIAL_HOLIDAY_NAME,
  OFFICIAL_RULE,
  REMINDER_HOLIDAY_NAME,
  REMINDER_RULE,
  SECOND_REMINDER_RULE,
  buildHolidaysListHelper,
} from 'src/app/shared/testing/holiday-list.testing';

const SEPTEMBER_SAMPLE_DATE = '2026-09-15';
const SAME_DATE_HOLIDAY_WIRE_DATE = '2026-12-25';
const OFFICIAL_HOLIDAY_COLOR = '#48C9B0';
const UNOFFICIAL_HOLIDAY_COLOR = '#F7DC6F';

describe('DashboardResourceMonitorComponent', () => {
  let component: DashboardResourceMonitorComponent;
  let fixture: ComponentFixture<DashboardResourceMonitorComponent>;
  let mockLocaleService: { getLocale: ReturnType<typeof vi.fn>; locale: ReturnType<typeof signal<string>> };
  let mockDataDashboardService: { getResourceMonitor: ReturnType<typeof vi.fn> };
  let mockHolidayCollectionService: {
    isReset: ReturnType<typeof signal<boolean>>;
    currentYear: number;
    holidays: HolidaysListHelper;
    readDataAsync: ReturnType<typeof vi.fn>;
    setSelection: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockDataDashboardService = {
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
      backGroundColorOfficiallyHoliday: OFFICIAL_HOLIDAY_COLOR,
      backGroundColorHolyday: UNOFFICIAL_HOLIDAY_COLOR,
    };
    const mockWeekConfigurationService = { getWeekendSlot: vi.fn().mockReturnValue(null) };
    mockHolidayCollectionService = {
      isReset: signal(false),
      currentYear: 2026,
      holidays: new HolidaysListHelper(),
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
      .overrideComponent(DashboardResourceMonitorComponent, {
        set: {
          imports: [],
          template: '',
          providers: [{ provide: HolidayCollectionService, useValue: mockHolidayCollectionService }],
        },
      })
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

  describe('holiday special days', () => {
    beforeEach(() => {
      mockDataDashboardService.getResourceMonitor.mockReturnValue(
        of({
          dailyData: [
            { date: SAME_DATE_HOLIDAY_WIRE_DATE, dienstCount: 0, absenzCount: 0, wunschCount: 0, maxCount: 0, totalCount: 0 },
          ],
        })
      );
    });

    it.each(OFFICIAL_AND_REMINDER_ORDERINGS)(
      'paints the official color and names the official entry when two entries share the date (%s)',
      (_label, rules) => {
        mockHolidayCollectionService.holidays = buildHolidaysListHelper(rules);
        component.ngOnInit();

        const holidays = component.specialDays().filter((day) => day.type === 'holiday');

        expect(holidays).toHaveLength(1);
        expect(holidays[0].color).toBe(OFFICIAL_HOLIDAY_COLOR);
        expect(holidays[0].tooltip).toBe(OFFICIAL_HOLIDAY_NAME);
      }
    );

    it('paints the unofficial holiday color for a reminder-only date', () => {
      mockHolidayCollectionService.holidays = buildHolidaysListHelper([REMINDER_RULE, SECOND_REMINDER_RULE]);
      component.ngOnInit();

      const holidays = component.specialDays().filter((day) => day.type === 'holiday');

      expect(holidays).toHaveLength(1);
      expect(holidays[0].color).toBe(UNOFFICIAL_HOLIDAY_COLOR);
      expect(holidays[0].tooltip).toBe(REMINDER_HOLIDAY_NAME);
    });

    it('adds no holiday special day for a date without a holiday', () => {
      mockHolidayCollectionService.holidays = buildHolidaysListHelper([OFFICIAL_RULE, REMINDER_RULE]);
      mockDataDashboardService.getResourceMonitor.mockReturnValue(
        of({
          dailyData: [
            { date: SEPTEMBER_SAMPLE_DATE, dienstCount: 0, absenzCount: 0, wunschCount: 0, maxCount: 0, totalCount: 0 },
          ],
        })
      );
      component.ngOnInit();

      expect(component.specialDays().filter((day) => day.type === 'holiday')).toHaveLength(0);
    });
  });
});
