// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { CounterComponent } from './counter.component';

describe('CounterComponent', () => {
    let component: CounterComponent;
    let fixture: ComponentFixture<CounterComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                CounterComponent,
                FontAwesomeModule
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(CounterComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have default property values', () => {
        expect(component.maxNumber).toBe(99);
        expect(component.currentNumber).toBe(1);
    });

    it('should accept maxNumber input', () => {
        component.maxNumber = 50;
        expect(component.maxNumber).toBe(50);
    });

    it('should accept currentNumber input', () => {
        component.currentNumber = 10;
        expect(component.currentNumber).toBe(10);
    });

    it('should display current number in template', () => {
        component.currentNumber = 15;
        fixture.detectChanges();

        const numberDisplay = fixture.nativeElement.querySelector('.ownPaginationBlock:nth-child(2)');
        expect(numberDisplay.textContent.trim()).toBe('15');
    });

    it('should increment current number when clicking right button', () => {
        vi.spyOn(component.isChanged, 'emit');
        component.currentNumber = 5;
        component.maxNumber = 10;

        component.onClickPaginationButton(1);

        expect(component.currentNumber).toBe(6);
        expect(component.isChanged.emit).toHaveBeenCalledWith(6);
    });

    it('should decrement current number when clicking left button', () => {
        vi.spyOn(component.isChanged, 'emit');
        component.currentNumber = 5;

        component.onClickPaginationButton(-1);

        expect(component.currentNumber).toBe(4);
        expect(component.isChanged.emit).toHaveBeenCalledWith(4);
    });

    it('should not decrement below 1', () => {
        vi.spyOn(component.isChanged, 'emit');
        component.currentNumber = 1;

        component.onClickPaginationButton(-1);

        expect(component.currentNumber).toBe(1);
        expect(component.isChanged.emit).toHaveBeenCalledWith(1);
    });

    it('should not increment above maxNumber', () => {
        vi.spyOn(component.isChanged, 'emit');
        component.currentNumber = 10;
        component.maxNumber = 10;

        component.onClickPaginationButton(1);

        expect(component.currentNumber).toBe(10);
        expect(component.isChanged.emit).toHaveBeenCalledWith(10);
    });

    it('should use default maxNumber when undefined', () => {
        vi.spyOn(component.isChanged, 'emit');
        component.currentNumber = 99;
        component.maxNumber = undefined;

        component.onClickPaginationButton(1);

        expect(component.currentNumber).toBe(99);
        expect(component.isChanged.emit).toHaveBeenCalledWith(99);
    });

    it('should handle zero change value', () => {
        vi.spyOn(component.isChanged, 'emit');
        const initialNumber = component.currentNumber;

        component.onClickPaginationButton(0);

        expect(component.currentNumber).toBe(initialNumber);
        expect(component.isChanged.emit).toHaveBeenCalledWith(initialNumber);
    });

    it('should render left arrow button', () => {
        fixture.detectChanges();

        const leftButton = fixture.nativeElement.querySelector('.ownPaginationBlockLeft');
        expect(leftButton).toBeTruthy();
        expect(leftButton.querySelector('fa-icon')).toBeTruthy();
    });

    it('should render right arrow button', () => {
        fixture.detectChanges();

        const rightButton = fixture.nativeElement.querySelector('.ownPaginationBlockRight');
        expect(rightButton).toBeTruthy();
        expect(rightButton.querySelector('fa-icon')).toBeTruthy();
    });

    it('should call onClickPaginationButton when left button is clicked', () => {
        vi.spyOn(component, 'onClickPaginationButton');
        fixture.detectChanges();

        const leftButton = fixture.nativeElement.querySelector('.ownPaginationBlockLeft');
        leftButton.click();

        expect(component.onClickPaginationButton).toHaveBeenCalledWith(-1);
    });

    it('should call onClickPaginationButton when right button is clicked', () => {
        vi.spyOn(component, 'onClickPaginationButton');
        fixture.detectChanges();

        const rightButton = fixture.nativeElement.querySelector('.ownPaginationBlockRight');
        rightButton.click();

        expect(component.onClickPaginationButton).toHaveBeenCalledWith(1);
    });

    it('should emit change event with current number', () => {
        let emittedNumber = 0;
        component.isChanged.subscribe((number: number) => {
            emittedNumber = number;
        });

        component.currentNumber = 7;
        component.onClickPaginationButton(1);

        expect(emittedNumber).toBe(8);
    });

    it('should handle large increment values', () => {
        vi.spyOn(component.isChanged, 'emit');
        component.currentNumber = 5;
        component.maxNumber = 10;

        component.onClickPaginationButton(10);

        expect(component.currentNumber).toBe(15);
        expect(component.isChanged.emit).toHaveBeenCalledWith(15);
    });

    it('should handle large decrement values', () => {
        vi.spyOn(component.isChanged, 'emit');
        component.currentNumber = 5;

        component.onClickPaginationButton(-10);

        expect(component.currentNumber).toBe(-5);
        expect(component.isChanged.emit).toHaveBeenCalledWith(-5);
    });

    it('should have proper container CSS class', () => {
        fixture.detectChanges();

        const container = fixture.nativeElement.querySelector('.ownPaginationContainer');
        expect(container).toBeTruthy();
    });

    it('should display updated number after multiple clicks', () => {
        component.currentNumber = 1;
        component.maxNumber = 5;
        fixture.detectChanges();

        component.onClickPaginationButton(1);
        component.onClickPaginationButton(1);
        fixture.componentRef.setInput('currentNumber', component.currentNumber);
        fixture.detectChanges();

        const numberDisplay = fixture.nativeElement.querySelector('.ownPaginationBlock:nth-child(2)');
        expect(numberDisplay.textContent.trim()).toBe('3');
    });
});
