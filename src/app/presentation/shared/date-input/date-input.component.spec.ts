// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NgbModule, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { DateInputComponent } from './date-input.component';

describe('DateInputComponent', () => {
    let component: DateInputComponent;
    let fixture: ComponentFixture<DateInputComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DateInputComponent, FormsModule, NgbModule, FontAwesomeModule]
        }).compileComponents();

        fixture = TestBed.createComponent(DateInputComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have default values', () => {
        expect(component.disabled).toBe(false);
        expect(component.placeholder).toBe('dd.mm.yyyy');
        expect(component.showLabel).toBe(true);
        expect(component.labelAlign).toBe('left');
        expect(component.inputWidth).toBe('medium-width');
        expect(component.value).toBe(null);
    });

    it('should initialize with null value', () => {
        expect(component.value).toBe(null);
    });

    it('should emit valueChange and dateChange when updateValue is called', () => {
        vi.spyOn(component.valueChange, 'emit');
        vi.spyOn(component.dateChange, 'emit');

        const testDate: NgbDateStruct = { year: 2024, month: 12, day: 25 };
        component.value = testDate;
        component['updateValue']();

        expect(component.valueChange.emit).toHaveBeenCalledWith(testDate);
        expect(component.dateChange.emit).toHaveBeenCalledWith(testDate);
    });

    it('should handle date change with valid date', () => {
        const testDate: NgbDateStruct = { year: 2024, month: 6, day: 15 };

        vi.spyOn(component.valueChange, 'emit');
        vi.spyOn(component.dateChange, 'emit');

        component.onDateChange(testDate);

        expect(component.value).toEqual(testDate);
        expect(component.valueChange.emit).toHaveBeenCalledWith(testDate);
        expect(component.dateChange.emit).toHaveBeenCalledWith(testDate);
    });

    it('should handle date change with null', () => {
        vi.spyOn(component.valueChange, 'emit');
        vi.spyOn(component.dateChange, 'emit');

        component.onDateChange(null);

        expect(component.value).toBe(null);
        expect(component.valueChange.emit).toHaveBeenCalledWith(null);
        expect(component.dateChange.emit).toHaveBeenCalledWith(null);
    });

    it('should handle date change with undefined', () => {
        vi.spyOn(component.valueChange, 'emit');
        vi.spyOn(component.dateChange, 'emit');

        component.onDateChange(undefined);

        expect(component.value).toBe(undefined);
        expect(component.valueChange.emit).toHaveBeenCalledWith(undefined);
        expect(component.dateChange.emit).toHaveBeenCalledWith(undefined);
    });

    it('should accept NgbDateStruct value', () => {
        const testDate: NgbDateStruct = { year: 2023, month: 3, day: 10 };
        component.value = testDate;

        expect(component.value).toEqual(testDate);
    });

    it('should accept null value', () => {
        component.value = null;
        expect(component.value).toBe(null);
    });

    it('should accept undefined value', () => {
        component.value = undefined;
        expect(component.value).toBe(undefined);
    });

    it('should display label when showLabel is true', () => {
        component.showLabel = true;
        component.label = 'Test Date Label';
        fixture.detectChanges();

        const labelElement = fixture.nativeElement.querySelector('label[for]');
        expect(labelElement).toBeTruthy();
        expect(labelElement.textContent.trim()).toBe('Test Date Label');
    });

    it('should not display label when showLabel is false', () => {
        component.showLabel = false;
        component.label = 'Test Date Label';
        fixture.detectChanges();

        const labelElement = fixture.nativeElement.querySelector('label[for]');
        expect(labelElement).toBeFalsy();
    });

    it('should set label alignment style', () => {
        component.showLabel = true;
        component.label = 'Test Date Label';
        component.labelAlign = 'right';
        fixture.detectChanges();

        const labelElement = fixture.nativeElement.querySelector('label[for]');
        expect(labelElement.style.textAlign).toBe('right');
    });

    it('should set correct input properties', () => {
        component.inputId = 'test-date-id';
        component.inputName = 'test-date-name';
        component.placeholder = 'Custom placeholder';
        fixture.detectChanges();

        const inputElement = fixture.nativeElement.querySelector('input');
        expect(inputElement.id).toBe('test-date-id');
        expect(inputElement.placeholder).toBe('Custom placeholder');
    });

    it('should accept and store inputName property', () => {
        component.inputName = 'test-date-name';
        expect(component.inputName).toBe('test-date-name');
    });

    it('should disable input when disabled is true', () => {
        component.disabled = true;
        fixture.detectChanges();

        const inputElement = fixture.nativeElement.querySelector('input');
        expect(inputElement.disabled).toBe(true);
    });

    it('should enable input when disabled is false', () => {
        component.disabled = false;
        fixture.detectChanges();

        const inputElement = fixture.nativeElement.querySelector('input');
        expect(inputElement.disabled).toBe(false);
    });

    it('should have correct input width class', () => {
        component.inputWidth = 'small-width';
        fixture.detectChanges();

        const inputGroup = fixture.nativeElement.querySelector('.input-group');
        expect(inputGroup.classList.contains('small-width')).toBe(true);
    });

    it('should display calendar icon', () => {
        const iconElement = fixture.nativeElement.querySelector('fa-icon');
        expect(iconElement).toBeTruthy();
    });

    it('should handle multiple date changes correctly', () => {
        vi.spyOn(component.valueChange, 'emit');
        vi.spyOn(component.dateChange, 'emit');

        const date1: NgbDateStruct = { year: 2024, month: 1, day: 1 };
        const date2: NgbDateStruct = { year: 2024, month: 12, day: 31 };

        component.onDateChange(date1);
        expect(component.value).toEqual(date1);
        expect(component.valueChange.emit).toHaveBeenCalledWith(date1);

        component.onDateChange(date2);
        expect(component.value).toEqual(date2);
        expect(component.valueChange.emit).toHaveBeenCalledWith(date2);

        expect(component.valueChange.emit).toHaveBeenCalledTimes(2);
        expect(component.dateChange.emit).toHaveBeenCalledTimes(2);
    });

    it('should maintain container structure', () => {
        const containerElement = fixture.nativeElement.querySelector('.date-input-container');
        expect(containerElement).toBeTruthy();
    });

    it('should set container alignment based on labelAlign', () => {
        component.labelAlign = 'center';
        fixture.detectChanges();

        const containerElement = fixture.nativeElement.querySelector('.date-input-container');
        expect(containerElement.style.alignItems).toBe('center');
    });

    it('should handle edge case dates correctly', () => {
        const leapYearDate: NgbDateStruct = { year: 2024, month: 2, day: 29 };

        vi.spyOn(component.valueChange, 'emit');

        component.onDateChange(leapYearDate);

        expect(component.value).toEqual(leapYearDate);
        expect(component.valueChange.emit).toHaveBeenCalledWith(leapYearDate);
    });
});
