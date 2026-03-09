// Copyright (c) Heribert Gasparoli Private. All rights reserved.

 
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { OwnerAddressComponent } from './owner-address.component';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { ClientConfigService } from 'src/app/domain/services/client/client-config.service';
import { DataManagementCalendarSelectionService } from 'src/app/domain/services/calendar/data-management-calendar-selection.service';

describe('OwnerAddressComponent', () => {
    let component: OwnerAddressComponent;
    let fixture: ComponentFixture<OwnerAddressComponent>;

    beforeEach(async () => {
        const mockAppSettingsService = {
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
            contactSettings: vi.fn().mockReturnValue({
                addressName: 'Test Company',
                phone: '+49 123 456789',
                supplementAddress: '',
                email: 'info@test.de',
                address: 'Teststrasse 123',
                zip: '12345',
                place: 'Teststadt',
                country: 'DE',
                state: 'BY',
                globalCalendarCountry: 'DE',
                globalCalendarState: 'BY',
                globalCalendarSelectionId: 'cal-1'
            }),
            loadSettingsAsync: vi.fn().mockResolvedValue(undefined),
            settingsChangeTrigger: signal(0),
            isReset: signal(false)
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
                { provide: TranslateService, useValue: translateServiceSpy }
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
});
