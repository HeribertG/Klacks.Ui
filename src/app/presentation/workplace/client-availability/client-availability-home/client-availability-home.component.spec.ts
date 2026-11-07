// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ClientAvailabilityHomeComponent } from './client-availability-home.component';
import { ClientAvailabilityHeaderComponent } from '../client-availability-header/client-availability-header.component';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { DirectionService } from 'src/app/application/services/direction.service';
import { QuickPrintActionService } from 'src/app/presentation/services/quick-print-action.service';
import { AvailabilitySettingService } from '../services/availability-setting.service';
import { AvailabilitySelectionService } from '../services/availability-selection.service';
import {
  AvailabilityCalculationService,
  RenderAvailabilityGridService,
} from '../services/render-availability-grid';
import { DataManagementClientAvailabilityService } from 'src/app/domain/services/client-availability/data-management-client-availability.service';
import { ClientAvailabilityFilterService } from 'src/app/domain/services/client-availability/client-availability-filter.service';
import { ClientAvailabilityClientListService } from 'src/app/domain/services/client-availability/client-availability-client-list.service';
import { HolidayCollectionService } from 'src/app/presentation/shared/grid/services/holiday-collection.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { SearchStrategyService } from 'src/app/presentation/search/search-strategy.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { SearchService } from 'src/app/application/services/search.service';
import { CalendarChipsResolverService } from 'src/app/domain/services/calendar/calendar-chips-resolver.service';
import { DataRefreshRegistry } from 'src/app/application/services/data-refresh-registry.service';
import { PaymentInterval } from 'src/app/domain/models/contract/payment-interval.enum';
import { formatDateOnly } from 'src/app/domain/helpers/date.helper';
import {
  activeJanuaryOffsetMinutes,
  CALENDAR_TEST_ZONES,
  expectedJanuaryOffsetMinutes,
  useTimeZone,
} from 'src/app/shared/testing/time-zone.testing';

const SUNDAY_2026_12_06_NOON = [2026, 11, 6, 12] as const;
const MONTH_KEYS = Array.from({ length: 12 }, (_, index) => `month.${index + 1}`);

describe('ClientAvailabilityHomeComponent', () => {
  let workSettings: ReturnType<typeof signal<{ paymentInterval: number }>>;
  let schedulingDefaultSettings: ReturnType<typeof signal<{ weekStartDay: string; weekendDays: string[] }>>;
  let calculation: { startDate: Date; formatDateOnly: (date: Date) => string; getEndDate: () => string };
  let availabilitySettings: { viewMode: ReturnType<typeof signal<PaymentInterval>> };
  let readAvailability: ReturnType<typeof vi.fn>;
  let fixture: ComponentFixture<ClientAvailabilityHomeComponent>;

  const createAndInitialize = async (): Promise<void> => {
    fixture = TestBed.createComponent(ClientAvailabilityHomeComponent);
    fixture.detectChanges();
    await vi.waitFor(() => expect(readAvailability).toHaveBeenCalled());
    fixture.detectChanges();
  };

  const headerText = (): string =>
    (fixture.nativeElement.querySelector('#header-period') as HTMLElement).textContent?.trim() ?? '';

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    readAvailability = vi.fn(async () => undefined);
    workSettings = signal({ paymentInterval: PaymentInterval.Monthly });
    schedulingDefaultSettings = signal({ weekStartDay: 'Monday', weekendDays: [] as string[] });
    calculation = { startDate: new Date(), formatDateOnly, getEndDate: () => '' };
    availabilitySettings = { viewMode: signal(PaymentInterval.Weekly) };

    TestBed.configureTestingModule({
      imports: [ClientAvailabilityHomeComponent, TranslateModule.forRoot()],
      providers: [
        { provide: GridSettingsService, useValue: { monthsName: MONTH_KEYS } },
        { provide: DirectionService, useValue: { direction: signal('ltr') } },
        {
          provide: QuickPrintActionService,
          useValue: { ensureDefaultsLoaded: vi.fn(async () => undefined), hasDefault: () => false },
        },
        {
          provide: AppSettingsManagementService,
          useValue: {
            workSettings,
            schedulingDefaultSettings,
            loadSettingsAsync: vi.fn(async () => {
              workSettings.set({ paymentInterval: PaymentInterval.Weekly });
              schedulingDefaultSettings.set({ weekStartDay: 'Sunday', weekendDays: [] });
            }),
          },
        },
        { provide: GridColorService, useValue: { readDataAsync: vi.fn(async () => undefined) } },
        { provide: GridFontsService, useValue: { readDataAsync: vi.fn(async () => undefined) } },
        { provide: SavebarService, useValue: { setSavebarVisibility: vi.fn() } },
        { provide: LayoutService, useValue: { setContainerToFullSize: vi.fn() } },
        { provide: SearchService, useValue: { setSearchVisibility: vi.fn() } },
        { provide: WorkplaceStateService, useValue: { setNameOfVisibleEntity: vi.fn(), isFocusChanged: signal(false) } },
        { provide: SearchStrategyService, useValue: { addStrategy: vi.fn(), removeStrategy: vi.fn() } },
        {
          provide: GroupSelectionService,
          useValue: {
            selectedGroup: null,
            selectedGroupId: null,
            registerClientAvailabilityCallback: vi.fn(),
            unregisterClientAvailabilityCallback: vi.fn(),
          },
        },
        { provide: ClientAvailabilityClientListService, useValue: { loadClients: vi.fn(async () => []) } },
        {
          provide: CalendarChipsResolverService,
          useValue: { resolveActiveSelection: vi.fn(async () => ({ tokens: [], overrides: [] })) },
        },
        { provide: DataRefreshRegistry, useValue: { register: vi.fn(() => () => undefined) } },
      ],
    });
    TestBed.overrideComponent(ClientAvailabilityHeaderComponent, {
      set: {
        template:
          '<span id="header-period">{{ displayPeriod }} {{ displayYear }}</span>'
          + '<button id="header-next" (click)="goToNext()"></button>',
        imports: [],
      },
    });
    TestBed.overrideComponent(ClientAvailabilityHomeComponent, {
      set: {
        template:
          '<app-client-availability-header #header [viewMode]="viewMode" (periodChanged)="onPeriodChanged($event)" />',
        imports: [ClientAvailabilityHeaderComponent],
        providers: [
          { provide: AvailabilitySettingService, useValue: availabilitySettings },
          { provide: AvailabilityCalculationService, useValue: calculation },
          { provide: RenderAvailabilityGridService, useValue: { initialize: vi.fn(), setClients: vi.fn() } },
          { provide: DataManagementClientAvailabilityService, useValue: { readDataAsync: readAvailability } },
          {
            provide: ClientAvailabilityFilterService,
            useValue: { buildFilter: vi.fn(() => ({})), notifyClientsChanged: vi.fn() },
          },
          {
            provide: HolidayCollectionService,
            useValue: { readDataAsync: vi.fn(async () => undefined), setSelection: vi.fn() },
          },
          { provide: AvailabilitySelectionService, useValue: { clearSelection: vi.fn() } },
        ],
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  for (const zone of CALENDAR_TEST_ZONES) {
    describe(zone, () => {
      useTimeZone(zone);

      it('activates the configured zone', () => {
        expect(activeJanuaryOffsetMinutes()).toBe(expectedJanuaryOffsetMinutes(zone));
      });

      it('loads the settings itself and starts the weekly view on the configured Sunday week start', async () => {
        vi.setSystemTime(new Date(...SUNDAY_2026_12_06_NOON));

        await createAndInitialize();

        expect(formatDateOnly(calculation.startDate)).toBe('2026-12-06');
        expect(availabilitySettings.viewMode()).toBe(PaymentInterval.Weekly);
        expect(TestBed.inject(AppSettingsManagementService).loadSettingsAsync).toHaveBeenCalled();
      });

      it('shows the week of the grid in the header and moves one week with the first next click', async () => {
        vi.setSystemTime(new Date(...SUNDAY_2026_12_06_NOON));

        await createAndInitialize();

        expect(headerText()).toBe('client-availability.calendar-week 50 2026');

        readAvailability.mockClear();
        (fixture.nativeElement.querySelector('#header-next') as HTMLButtonElement).click();
        await vi.waitFor(() => expect(readAvailability).toHaveBeenCalled());
        fixture.detectChanges();

        expect(formatDateOnly(calculation.startDate)).toBe('2026-12-13');
        expect(headerText()).toBe('client-availability.calendar-week 51 2026');
      });
    });
  }
});
