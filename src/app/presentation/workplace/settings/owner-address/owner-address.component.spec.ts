// Copyright (c) Heribert Gasparoli Private. All rights reserved.

 
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { signal, WritableSignal } from '@angular/core';
import { of } from 'rxjs';

import { OwnerAddressComponent } from './owner-address.component';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { ClientConfigService } from 'src/app/domain/services/client/client-config.service';
import { DataManagementCalendarSelectionService } from 'src/app/domain/services/calendar/data-management-calendar-selection.service';
import { CompanyClockService } from 'src/app/domain/services/settings/company-clock.service';
import { IAppContactSettings } from 'src/app/domain/models/settings/app-settings.model';

describe('OwnerAddressComponent', () => {
    let component: OwnerAddressComponent;
    let fixture: ComponentFixture<OwnerAddressComponent>;
    let mockCompanyClockService: { source: ReturnType<typeof signal<string | null>> };
    let mockAppSettingsService: {
        contactSettings: WritableSignal<Partial<IAppContactSettings>>;
        saveImmediately: ReturnType<typeof vi.fn>;
        [member: string]: unknown;
    };
    let mockCompanyClockReload: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        mockAppSettingsService = {
            workSettings: vi.fn().mockReturnValue({}),
            invoiceSettings: vi.fn().mockReturnValue({
                addressName: 'Test Company',
                phone: '+49 123 456789',
                supplementAddress: '',
                email: 'info@test.de',
                address: 'Teststrasse 123',
                zip: '12345',
                place: 'Teststadt',
                selectedCountry: 'DE',
                selectedState: 'BY',
                selectedCalendarId: 'cal-1'
            }),
            contactSettings: signal<Partial<IAppContactSettings>>({
                addressName: 'Test Company',
                phone: '+49 123 456789',
                supplementAddress: '',
                email: 'info@test.de',
                address: 'Teststrasse 123',
                zip: '12345',
                place: 'Teststadt',
                country: 'DE',
                state: 'BY',
                timeZone: 'Europe/Berlin',
                globalCalendarCountry: 'DE',
                globalCalendarState: 'BY',
                globalCalendarSelectionId: 'cal-1'
            }),
            loadSettingsAsync: vi.fn().mockResolvedValue(undefined),
            saveImmediately: vi.fn().mockResolvedValue(undefined),
            settingsChangeTrigger: signal(0),
            isReset: signal(false)
        };

        mockCompanyClockService = {
            source: signal<string | null>(null),
        };
        mockCompanyClockReload = vi.fn().mockResolvedValue(undefined);
        const mockCompanyClockServiceProvider = {
            ...mockCompanyClockService,
            loadIfAuthenticated: vi.fn().mockResolvedValue(undefined),
            reload: mockCompanyClockReload,
        };

        const mockClientConfigService = {
            countryList: [{ code: 'DE', name: 'Germany' }],
            stateList: vi.fn().mockReturnValue([{ code: 'BY', name: 'Bavaria', country: 'DE' }]),
            calendars: [{ id: 'cal-1', name: 'Default' }],
            countries: vi.fn().mockReturnValue([{ code: 'DE', name: 'Germany' }]),
            states: vi.fn().mockReturnValue([{ code: 'BY', name: 'Bavaria', country: 'DE' }]),
            init: vi.fn().mockResolvedValue(undefined)
        };

        const mockCalendarSelectionService = {
            selectedCountry: signal('DE'),
            selectedState: signal('BY'),
            selectedCalendarId: signal('cal-1'),
            calendarsSelections: [],
            setSelectedCountry: vi.fn(),
            setSelectedState: vi.fn(),
            setSelectedCalendarId: vi.fn(),
            calendarChanged$: of(),
            readData: vi.fn().mockResolvedValue(undefined)
        };

        const translateServiceSpy = {
            instant: vi.fn().mockReturnValue('Translated text'),
            get: vi.fn().mockReturnValue(of('Translated text')),
            onLangChange: of({ lang: 'de' }),
            onTranslationChange: of(),
            onDefaultLangChange: of()
        };

        await TestBed.configureTestingModule({
            imports: [OwnerAddressComponent, TranslateModule.forRoot(), FormsModule],
            providers: [
                { provide: AppSettingsManagementService, useValue: mockAppSettingsService },
                { provide: ClientConfigService, useValue: mockClientConfigService },
                { provide: DataManagementCalendarSelectionService, useValue: mockCalendarSelectionService },
                { provide: TranslateService, useValue: translateServiceSpy },
                { provide: CompanyClockService, useValue: mockCompanyClockServiceProvider }
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(OwnerAddressComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('Initialization', () => {
        it('should initialize component with injected services', () => {
            // Arrange & Act
            fixture.detectChanges();

            // Assert
            expect(component.translate).toBeDefined();
            expect(component.clientConfigService).toBeDefined();
            expect(component.calendarSelectionService).toBeDefined();
        });
    });

    describe('company clock UTC warning', () => {
        it('is hidden when the company clock source is resolved', () => {
            mockCompanyClockService.source.set('AddressCountry');
            fixture.detectChanges();

            expect(component.showUtcWarning()).toBe(false);
        });

        it('is shown when the company clock source is Utc', () => {
            mockCompanyClockService.source.set('Utc');
            fixture.detectChanges();

            expect(component.showUtcWarning()).toBe(true);
        });
    });

    describe('company time zone change', () => {
        it('saves the new zone synchronously before reloading the company clock', async () => {
            await component.ngOnInit();
            let savedTimeZone: string | undefined;
            mockAppSettingsService.saveImmediately.mockImplementation(() => {
                savedTimeZone = mockAppSettingsService.contactSettings().timeZone;
                return Promise.resolve();
            });

            component.onTimeZoneChange('Asia/Kolkata');

            expect(mockAppSettingsService.saveImmediately).toHaveBeenCalledTimes(1);
            expect(savedTimeZone).toBe('Asia/Kolkata');
            await Promise.resolve();
            expect(mockCompanyClockReload).toHaveBeenCalledTimes(1);
        });

        it('keeps the other contact settings when the zone changes', async () => {
            await component.ngOnInit();

            component.onTimeZoneChange('Asia/Kolkata');

            expect(mockAppSettingsService.contactSettings().addressName).toBe('Test Company');
            expect(mockAppSettingsService.contactSettings().country).toBe('DE');
        });
    });
});
