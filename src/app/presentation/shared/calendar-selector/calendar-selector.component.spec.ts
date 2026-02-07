/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { of, Subject } from 'rxjs';

import { CalendarSelectorComponent } from './calendar-selector.component';
import { DataManagementCalendarSelectionService } from 'src/app/domain/services/calendar/data-management-calendar-selection.service';
import { DataManagementCalendarRulesService } from 'src/app/domain/services/calendar/data-management-calendar-rules.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { ModalService, ModalType, } from 'src/app/presentation/modal/modal.service';
import { CalendarDropdownComponent } from '../calendar-dropdown/calendar-dropdown.component';
import { ChipsComponent } from '../chips/chips.component';
import { CalendarSelection, SelectedCalendar, } from 'src/app/domain/models/calendar/calendar-selection-class';
import { StateCountryToken } from 'src/app/domain/models/calendar/calendar-rule-class';
import { MultiLanguage } from 'src/app/domain/models/translation/multi-language-class';

describe('CalendarSelectorComponent', () => {
    let component: CalendarSelectorComponent;
    let fixture: ComponentFixture<CalendarSelectorComponent>;
    let dataManagementCalendarSelectionService: any;
    let dataManagementCalendarRulesService: any;
    let localStorageService: any;
    let modalService: any;
    let translateService: any;

    beforeEach(async () => {
        const calendarSelectionSpy = {
            readData: vi.fn(),
            readSChips: vi.fn(),
            updateCalendarSelection: vi.fn(),
            getCalendarSelection: vi.fn(),
            addCalendarSelection: vi.fn(),
            deleteCalendarSelection: vi.fn(),
            isCurrentCalendarSelectionEmptyPlaceholder: vi.fn(),
            isFilterDirty: vi.fn(),
            setCurrentOnEmpty: vi.fn(),
            saveCurrentSelectedCalendarList: vi.fn(),
            calendarsSelections: [],
            currentCalendarSelection: new CalendarSelection(),
            chips: [],
            emptyPlaceholder: 'None',
            isChanged: {
                set: vi.fn()
            },
            isRead: vi.fn().mockReturnValue(false),
            isNew: vi.fn().mockReturnValue(false)
        };

        const calendarRulesSpy = {
            init: vi.fn(),
            setValue: vi.fn(),
            filterStatesByCountries: vi.fn(),
            selectStates: vi.fn(),
            currentFilter: { list: [], countries: [] },
            selectedCountry: '',
            isRead: vi.fn().mockReturnValue(false)
        };

        const localStorageSpy = {
            get: vi.fn(),
            set: vi.fn(),
            remove: vi.fn()
        };
        const modalSpy = {
            setDefault: vi.fn(),
            openModel: vi.fn(),
            resultEvent: new Subject<ModalType>(),
            contentInputString: '',
            deleteMessage: '',
            message: '',
            contentInputTitle: ''
        };

        await TestBed.configureTestingModule({
            imports: [
                CalendarSelectorComponent,
                TranslateModule.forRoot(),
                FontAwesomeModule,
                CalendarDropdownComponent,
                ChipsComponent,
            ],
            providers: [
                {
                    provide: DataManagementCalendarSelectionService,
                    useValue: calendarSelectionSpy,
                },
                {
                    provide: DataManagementCalendarRulesService,
                    useValue: calendarRulesSpy,
                },
                { provide: LocalStorageService, useValue: localStorageSpy },
                { provide: ModalService, useValue: modalSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CalendarSelectorComponent);
        component = fixture.componentInstance;

        dataManagementCalendarSelectionService = TestBed.inject(DataManagementCalendarSelectionService) as any;
        dataManagementCalendarRulesService = TestBed.inject(DataManagementCalendarRulesService) as any;
        localStorageService = TestBed.inject(LocalStorageService) as any;
        modalService = TestBed.inject(ModalService) as any;
        translateService = TestBed.inject(TranslateService) as any;

        // Setup default translation responses
        vi.spyOn(translateService, 'get').mockReturnValue(of('Translated Text'));
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have default property values', () => {
        expect(component.addButtonEnabled).toBe(false);
        expect(component.delButtonEnabled).toBe(false);
        expect(component.deleteMessage).toBe('');
        expect(component.message).toBe('');
        expect(component.headerCalendarDropdown).toBe('');
    });

    it('should initialize calendar rules service on ngOnInit', () => {
        component.ngOnInit();

        expect(dataManagementCalendarRulesService.init).toHaveBeenCalled();
    });

    it('should read data on ngAfterViewInit', () => {
        component.ngAfterViewInit();

        expect(dataManagementCalendarSelectionService.readData).toHaveBeenCalled();
    });

    it('should compare calendars correctly', () => {
        const calendar1 = new CalendarSelection();
        calendar1.id = 'test-id-1';

        const calendar2 = new CalendarSelection();
        calendar2.id = 'test-id-1';

        const calendar3 = new CalendarSelection();
        calendar3.id = 'test-id-2';

        expect(component.compareCalendars(calendar1, calendar2)).toBe(true);
        expect(component.compareCalendars(calendar1, calendar3)).toBe(false);
    });

    it('should emit changeEvent when onChangeFilter is called', () => {
        vi.spyOn(component.changeEvent, 'emit');

        component.onChangeFilter();

        expect(component.changeEvent.emit).toHaveBeenCalled();
    });

    it('should get chip display name correctly', () => {
        const chip: StateCountryToken = {
            id: 'test-id',
            country: 'Germany',
            countryName: new MultiLanguage(),
            state: 'Bavaria',
            stateName: new MultiLanguage(),
            select: false,
        };

        const displayName = component.getChipDisplayName(chip);

        expect(displayName).toBe('Germany-Bavaria');
    });

    it('should get chip key correctly', () => {
        const chip: StateCountryToken = {
            id: 'test-id',
            country: 'Germany',
            countryName: new MultiLanguage(),
            state: 'Bavaria',
            stateName: new MultiLanguage(),
            select: false,
        };

        const key = component.getChipKey(chip);

        expect(key).toBe('Germany|Bavaria');
    });

    it('should track chips by key', () => {
        const chip: StateCountryToken = {
            id: 'test-id',
            country: 'USA',
            countryName: new MultiLanguage(),
            state: 'California',
            stateName: new MultiLanguage(),
            select: false,
        };

        const trackKey = component.trackByChip(0, chip);

        expect(trackKey).toBe('USA|California');
    });

    it('should determine if add button should be enabled', () => {
        // Mock calendar selection with selected calendars
        const mockSelection = new CalendarSelection();
        const selectedCalendar = new SelectedCalendar();
        selectedCalendar.country = 'Test';
        selectedCalendar.state = 'Test';
        mockSelection.selectedCalendars = [selectedCalendar];

        // Set the property directly on the spy object
        Object.defineProperty(dataManagementCalendarSelectionService, 'currentCalendarSelection', {
            value: mockSelection,
            writable: true,
            configurable: true,
        });

        expect(component.shouldEnableAddButton).toBe(true);
    });

    it('should determine if calendar selections are valid', () => {
        // Set the properties directly on the spy object
        Object.defineProperty(dataManagementCalendarSelectionService, 'calendarsSelections', {
            value: [new CalendarSelection()],
            writable: true,
            configurable: true,
        });
        Object.defineProperty(dataManagementCalendarSelectionService, 'currentCalendarSelection', {
            value: new CalendarSelection(),
            writable: true,
            configurable: true,
        });

        expect(component.hasValidCalendarSelections).toBe(true);
    });

    it('should determine if chips exist', () => {
        const mockChip: StateCountryToken = {
            id: 'test-id',
            country: 'Test',
            countryName: new MultiLanguage(),
            state: 'Test',
            stateName: new MultiLanguage(),
            select: false,
        };

        // Set the property directly on the spy object
        Object.defineProperty(dataManagementCalendarSelectionService, 'chips', {
            value: [mockChip],
            writable: true,
            configurable: true,
        });

        expect(component.hasChips).toBe(true);
    });

    it('should open modal with correct type', () => {
        component.onOpen(ModalType.Input);

        expect(modalService.setDefault).toHaveBeenCalledWith(ModalType.Input);
        expect(modalService.openModel).toHaveBeenCalledWith(ModalType.Input);
    });

    it('should emit openMenu when onIsClosing without dirty filter', () => {
        vi.spyOn(component.openMenu, 'emit');
        dataManagementCalendarSelectionService.isCurrentCalendarSelectionEmptyPlaceholder.mockReturnValue(true);
        dataManagementCalendarSelectionService.isFilterDirty.mockReturnValue(false);

        component.onIsClosing();

        expect(component.openMenu.emit).toHaveBeenCalled();
    });

    it('should call changeEvent emit when onChangeFilter with checkIfDirty', () => {
        vi.spyOn(component.changeEvent, 'emit');

        component.onChangeFilter(true);

        expect(dataManagementCalendarSelectionService.readSChips).toHaveBeenCalledWith(true);
        expect(component.changeEvent.emit).toHaveBeenCalled();
    });

    it('should handle onDeleteChip correctly', () => {
        const testKey = 'TestCountry|TestState';
        vi.spyOn(component.changeEvent, 'emit');

        // Mock the token finding to return undefined (not found case)
        component.onDeleteChip(testKey);

        expect(dataManagementCalendarSelectionService.readSChips).toHaveBeenCalledWith(true);
    });

    it('should clean up subscriptions on destroy', () => {
        vi.spyOn(component['ngUnsubscribe'], 'next');
        vi.spyOn(component['ngUnsubscribe'], 'complete');

        component.ngOnDestroy();

        expect(component['ngUnsubscribe'].next).toHaveBeenCalled();
        expect(component['ngUnsubscribe'].complete).toHaveBeenCalled();
    });
});
