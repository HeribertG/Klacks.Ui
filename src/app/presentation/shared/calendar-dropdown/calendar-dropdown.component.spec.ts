import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarDropdownComponent } from './calendar-dropdown.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataManagementCalendarRulesService } from 'src/app/domain/services/calendar/data-management-calendar-rules.service';
import { StateCountryToken } from 'src/app/domain/models/calendar-rule-class';
import { of } from 'rxjs';

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
      imports: [CalendarDropdownComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: DataManagementCalendarRulesService,
          useValue: mockDataManagementCalendarRulesService,
        },
      ],
    }).compileComponents();
    
    // Mock the TranslateService after TestBed is configured
    const translateService = TestBed.inject(TranslateService);
    spyOn(translateService, 'instant').and.returnValue('Translated Text');
    spyOn(translateService, 'get').and.returnValue(of('Translated Text'));
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
