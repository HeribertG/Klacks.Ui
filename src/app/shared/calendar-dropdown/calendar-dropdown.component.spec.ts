import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarDropdownComponent } from './calendar-dropdown.component';
import { TranslateModule } from '@ngx-translate/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DataManagementCalendarRulesService } from 'src/app/data/management/data-management-calendar-rules.service';
import { StateCountryToken } from 'src/app/core/calendar-rule-class';

describe('CalendarDropdownComponent', () => {
  let component: CalendarDropdownComponent;
  let fixture: ComponentFixture<CalendarDropdownComponent>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDataManagementCalendarRulesService: any;

  beforeEach(async () => {
    // Mock für den DataManagementCalendarRulesService
    mockDataManagementCalendarRulesService = jasmine.createSpyObj([
      'selectStates',
      'filterStatesByCountries',
      'setValue',
      'init',
    ]);
    mockDataManagementCalendarRulesService.selectedCountry = 'MockCountry';
    mockDataManagementCalendarRulesService.currentFilter = {
      countries: ['MockCountry'],
    };
    mockDataManagementCalendarRulesService.filteredRulesToken = [];

    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [CalendarDropdownComponent],
      providers: [
        {
          provide: DataManagementCalendarRulesService,
          useValue: mockDataManagementCalendarRulesService,
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CalendarDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit an event when onOpenChange is called', () => {
    spyOn(component.isOpening, 'emit');
    component.onOpenChange();
    expect(component.isOpening.emit).toHaveBeenCalled();
  });

  it('should call correct service method when onSelectStates is called', () => {
    component.onSelectStates(true);
    expect(
      mockDataManagementCalendarRulesService.selectStates
    ).toHaveBeenCalledWith('MockCountry', true);
  });

  it('should emit an event when onChangeStateSelection is called', () => {
    const mockValue = {
      state: 'MockState',
      country: 'MockCountry',
      select: true,
    } as StateCountryToken;
    spyOn(component.changed, 'emit');
    component.onChangeStateSelection(mockValue);
    expect(component.changed.emit).toHaveBeenCalled();
    expect(
      mockDataManagementCalendarRulesService.setValue
    ).toHaveBeenCalledWith(mockValue);
  });
});
