/* eslint-disable @typescript-eslint/no-unused-vars */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { of, Subject } from 'rxjs';

import { CalendarSelectorComponent } from './calendar-selector.component';
import { DataManagementCalendarSelectionService } from 'src/app/domain/services/data-management-calendar-selection.service';
import { DataManagementCalendarRulesService } from 'src/app/domain/services/data-management-calendar-rules.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';
import { CalendarDropdownComponent } from '../calendar-dropdown/calendar-dropdown.component';
import { ChipsComponent } from '../chips/chips.component';
import {
  CalendarSelection,
  SelectedCalendar,
} from 'src/app/domain/models/calendar-selection-class';
import { StateCountryToken } from 'src/app/domain/models/calendar-rule-class';
import { MultiLanguage } from 'src/app/domain/models/multi-language-class';

describe('CalendarSelectorComponent', () => {
  let component: CalendarSelectorComponent;
  let fixture: ComponentFixture<CalendarSelectorComponent>;
  let dataManagementCalendarSelectionService: jasmine.SpyObj<DataManagementCalendarSelectionService>;
  let dataManagementCalendarRulesService: jasmine.SpyObj<DataManagementCalendarRulesService>;
  let localStorageService: jasmine.SpyObj<LocalStorageService>;
  let modalService: jasmine.SpyObj<ModalService>;
  let translateService: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    const calendarSelectionSpy = jasmine.createSpyObj(
      'DataManagementCalendarSelectionService',
      [
        'readData',
        'readSChips',
        'updateCalendarSelection',
        'getCalendarSelection',
        'addCalendarSelection',
        'deleteCalendarSelection',
        'isCurrentCalendarSelectionEmptyPlaceholder',
        'isFilterDirty',
        'setCurrentOnEmpty',
        'saveCurrentSelectedCalendarList',
      ],
      {
        calendarsSelections: [],
        currentCalendarSelection: new CalendarSelection(),
        chips: [],
        emptyPlaceholder: 'None',
        isChanged: jasmine.createSpyObj('Signal', ['set']),
        isRead: jasmine.createSpy().and.returnValue(false),
        isNew: jasmine.createSpy().and.returnValue(false),
      }
    );

    const calendarRulesSpy = jasmine.createSpyObj(
      'DataManagementCalendarRulesService',
      ['init', 'setValue', 'filterStatesByCountries', 'selectStates'],
      {
        currentFilter: { list: [], countries: [] },
        selectedCountry: '',
        isRead: jasmine.createSpy().and.returnValue(false),
      }
    );

    const localStorageSpy = jasmine.createSpyObj('LocalStorageService', [
      'get',
      'set',
      'remove',
    ]);
    const modalSpy = jasmine.createSpyObj(
      'ModalService',
      ['setDefault', 'openModel'],
      {
        resultEvent: new Subject<ModalType>(),
        contentInputString: '',
        deleteMessage: '',
        message: '',
        contentInputTitle: '',
      }
    );

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

    dataManagementCalendarSelectionService = TestBed.inject(
      DataManagementCalendarSelectionService
    ) as jasmine.SpyObj<DataManagementCalendarSelectionService>;
    dataManagementCalendarRulesService = TestBed.inject(
      DataManagementCalendarRulesService
    ) as jasmine.SpyObj<DataManagementCalendarRulesService>;
    localStorageService = TestBed.inject(
      LocalStorageService
    ) as jasmine.SpyObj<LocalStorageService>;
    modalService = TestBed.inject(ModalService) as jasmine.SpyObj<ModalService>;
    translateService = TestBed.inject(
      TranslateService
    ) as jasmine.SpyObj<TranslateService>;

    // Setup default translation responses
    spyOn(translateService, 'get').and.returnValue(of('Translated Text'));
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
    spyOn(component.changeEvent, 'emit');

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
    Object.defineProperty(
      dataManagementCalendarSelectionService,
      'currentCalendarSelection',
      {
        value: mockSelection,
        writable: true,
        configurable: true,
      }
    );

    expect(component.shouldEnableAddButton).toBe(true);
  });

  it('should determine if calendar selections are valid', () => {
    // Set the properties directly on the spy object
    Object.defineProperty(
      dataManagementCalendarSelectionService,
      'calendarsSelections',
      {
        value: [new CalendarSelection()],
        writable: true,
        configurable: true,
      }
    );
    Object.defineProperty(
      dataManagementCalendarSelectionService,
      'currentCalendarSelection',
      {
        value: new CalendarSelection(),
        writable: true,
        configurable: true,
      }
    );

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
    spyOn(component.openMenu, 'emit');
    dataManagementCalendarSelectionService.isCurrentCalendarSelectionEmptyPlaceholder.and.returnValue(
      true
    );
    dataManagementCalendarSelectionService.isFilterDirty.and.returnValue(false);

    component.onIsClosing();

    expect(component.openMenu.emit).toHaveBeenCalled();
  });

  it('should call changeEvent emit when onChangeFilter with checkIfDirty', () => {
    spyOn(component.changeEvent, 'emit');

    component.onChangeFilter(true);

    expect(
      dataManagementCalendarSelectionService.readSChips
    ).toHaveBeenCalledWith(true);
    expect(component.changeEvent.emit).toHaveBeenCalled();
  });

  it('should handle onDeleteChip correctly', () => {
    const testKey = 'TestCountry|TestState';
    spyOn(component.changeEvent, 'emit');

    // Mock the token finding to return undefined (not found case)
    component.onDeleteChip(testKey);

    expect(
      dataManagementCalendarSelectionService.readSChips
    ).toHaveBeenCalledWith(true);
  });

  it('should clean up subscriptions on destroy', () => {
    spyOn(component['ngUnsubscribe'], 'next');
    spyOn(component['ngUnsubscribe'], 'complete');

    component.ngOnDestroy();

    expect(component['ngUnsubscribe'].next).toHaveBeenCalled();
    expect(component['ngUnsubscribe'].complete).toHaveBeenCalled();
  });
});
