import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarDropdownComponent } from './calendar-dropdown.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataManagementCalendarRulesService } from 'src/app/domain/services/calendar/data-management-calendar-rules.service';
import { StateCountryToken } from 'src/app/domain/models/calendar/calendar-rule-class';
import { of } from 'rxjs';

describe('CalendarDropdownComponent', () => {
    let component: CalendarDropdownComponent;
    let fixture: ComponentFixture<CalendarDropdownComponent>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockDataManagementCalendarRulesService: any;

    beforeEach(async () => {
        mockDataManagementCalendarRulesService = {
            selectStates: vi.fn(),
            filterStatesByCountries: vi.fn(),
            setValue: vi.fn(),
            init: vi.fn(),
            selectedCountry: 'MockCountry',
            currentFilter: {
                countries: ['MockCountry'],
            },
            filteredRulesToken: [],
        };

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
        vi.spyOn(translateService, 'instant').mockReturnValue('Translated Text');
        vi.spyOn(translateService, 'get').mockReturnValue(of('Translated Text'));
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
        vi.spyOn(component.isOpening, 'emit');
        component.onOpenChange();
        expect(component.isOpening.emit).toHaveBeenCalled();
    });

    it('should call correct service method when onSelectStates is called', () => {
        component.onSelectStates(true);
        expect(mockDataManagementCalendarRulesService.selectStates).toHaveBeenCalledWith('MockCountry', true);
    });

    it('should emit an event when onChangeStateSelection is called', () => {
        const mockValue = {
            state: 'MockState',
            country: 'MockCountry',
            select: true,
        } as StateCountryToken;
        vi.spyOn(component.changed, 'emit');
        component.onChangeStateSelection(mockValue);
        expect(component.changed.emit).toHaveBeenCalled();
        expect(mockDataManagementCalendarRulesService.setValue).toHaveBeenCalledWith(mockValue);
    });
});
