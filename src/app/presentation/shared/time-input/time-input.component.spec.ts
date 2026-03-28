// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TimeInputComponent } from './time-input.component';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';

describe('TimeInputComponent', () => {
    let component: TimeInputComponent;
    let fixture: ComponentFixture<TimeInputComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimeInputComponent, FormsModule],
        }).compileComponents();

        fixture = TestBed.createComponent(TimeInputComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have default values', () => {
        expect(component.disabled).toBe(false);
        expect(component.hoursMaxLength).toBe(3);
        expect(component.hoursPlaceholder).toBe('hh');
        expect(component.minutesPlaceholder).toBe('mm');
        expect(component.showLabel).toBe(true);
        expect(component.forDuration).toBe(true);
        expect(component.labelAlign).toBe('left');
    });

    it('should initialize with default OwnTime value', () => {
        expect(component.value).toBeInstanceOf(OwnTime);
        expect(component.value.hours).toBe('00');
        expect(component.value.minutes).toBe('00');
    });

    it('should emit valueChange and timeChange when updateValue is called', () => {
        vi.spyOn(component.valueChange, 'emit');
        vi.spyOn(component.timeChange, 'emit');

        const testValue = OwnTime.forDuration('10', '30');
        component.value = testValue;
        component['updateValue']();

        expect(component.valueChange.emit).toHaveBeenCalledWith(testValue);
        expect(component.timeChange.emit).toHaveBeenCalledWith(testValue);
    });

    it('should handle hours input change for duration', () => {
        component.forDuration = true;
        component.value = OwnTime.forDuration('05', '15');

        const mockEvent = {
            target: { value: '12' },
        } as any;

        vi.spyOn(component.valueChange, 'emit');
        vi.spyOn(component.timeChange, 'emit');

        component.onHoursInputChange(mockEvent);

        expect(component.value.hours).toBe('12');
        expect(component.value.minutes).toBe('15');
        expect(component.valueChange.emit).toHaveBeenCalled();
        expect(component.timeChange.emit).toHaveBeenCalled();
    });

    it('should handle hours input change for time (two digits)', () => {
        component.forDuration = false;
        component.value = OwnTime.forTime('05', '15');

        const mockEvent = {
            target: { value: '12' },
        } as any;

        vi.spyOn(component.valueChange, 'emit');
        vi.spyOn(component.timeChange, 'emit');

        component.onHoursInputChange(mockEvent);

        expect(component.value.hours).toBe('12');
        expect(component.value.minutes).toBe('15');
        expect(component.valueChange.emit).toHaveBeenCalled();
        expect(component.timeChange.emit).toHaveBeenCalled();
    });

    it('should handle minutes input change for duration', () => {
        component.forDuration = true;
        component.value = OwnTime.forDuration('10', '20');

        const mockEvent = {
            target: { value: '45' },
        } as any;

        vi.spyOn(component.valueChange, 'emit');
        vi.spyOn(component.timeChange, 'emit');

        component.onMinutesInputChange(mockEvent);

        expect(component.value.hours).toBe('10');
        expect(component.value.minutes).toBe('45');
        expect(component.valueChange.emit).toHaveBeenCalled();
        expect(component.timeChange.emit).toHaveBeenCalled();
    });

    it('should handle minutes input change for time', () => {
        component.forDuration = false;
        component.value = OwnTime.forTime('10', '20');

        const mockEvent = {
            target: { value: '45' },
        } as any;

        vi.spyOn(component.valueChange, 'emit');
        vi.spyOn(component.timeChange, 'emit');

        component.onMinutesInputChange(mockEvent);

        expect(component.value.hours).toBe('10');
        expect(component.value.minutes).toBe('45');
        expect(component.valueChange.emit).toHaveBeenCalled();
        expect(component.timeChange.emit).toHaveBeenCalled();
    });

    it('should emit keyUp event when onInputKeyUp is called', () => {
        vi.spyOn(component.keyUp, 'emit');

        const mockEvent = new KeyboardEvent('keyup');
        component.onInputKeyUp(mockEvent);

        expect(component.keyUp.emit).toHaveBeenCalledWith(mockEvent);
    });

    it('should display label when showLabel is true', () => {
        fixture.componentRef.setInput('showLabel', true);
        fixture.componentRef.setInput('label', 'Test Label');
        fixture.detectChanges();

        const labelElement = fixture.nativeElement.querySelector('label[for]');
        expect(labelElement).toBeTruthy();
        expect(labelElement.textContent.trim()).toBe('Test Label');
    });

    it('should not display label when showLabel is false', () => {
        component.showLabel = false;
        component.label = 'Test Label';
        fixture.detectChanges();

        const labelElement = fixture.nativeElement.querySelector('label[for]');
        expect(labelElement).toBeFalsy();
    });

    it('should set label alignment style', () => {
        fixture.componentRef.setInput('showLabel', true);
        fixture.componentRef.setInput('label', 'Test Label');
        fixture.componentRef.setInput('labelAlign', 'center');
        fixture.detectChanges();

        const labelElement = fixture.nativeElement.querySelector('label[for]');
        expect(labelElement.style.textAlign).toBe('center');
    });

    it('should set input values correctly', () => {
        fixture.componentRef.setInput('value', OwnTime.forDuration('123', '45'));
        fixture.detectChanges();

        const hoursInput = fixture.nativeElement.querySelector('.time-hour');
        const minutesInput = fixture.nativeElement.querySelector('.time-minute');

        expect(hoursInput.value).toBe('123');
        expect(minutesInput.value).toBe('45');
    });

    it('should disable inputs when disabled is true', () => {
        fixture.componentRef.setInput('disabled', true);
        fixture.detectChanges();

        const hoursInput = fixture.nativeElement.querySelector('.time-hour');
        const minutesInput = fixture.nativeElement.querySelector('.time-minute');

        expect(hoursInput.disabled).toBe(true);
        expect(minutesInput.disabled).toBe(true);
    });

    it('should handle invalid input gracefully', () => {
        const mockEvent = {
            target: { value: 'invalid' },
        } as any;

        vi.spyOn(component.valueChange, 'emit');

        expect(() => {
            component.onHoursInputChange(mockEvent);
        }).not.toThrow();

        expect(component.valueChange.emit).toHaveBeenCalled();
    });

    describe('Time mode (forDuration = false)', () => {
        beforeEach(() => {
            component.forDuration = false;
            component.value = OwnTime.forTime('00', '00');
        });

        it('should limit hours to 23 for time mode', () => {
            const mockEvent = {
                target: { value: '25' },
            } as any;

            component.onHoursInputChange(mockEvent);

            expect(component.value.hours).toBe('23');
        });

        it('should accept two-digit hours 0-23 for time mode', () => {
            const validHours = ['12', '23', '00', '08'];

            validHours.forEach((hour) => {
                const mockEvent = { target: { value: hour } } as any;
                component.onHoursInputChange(mockEvent);
                expect(component.value.hours).toBe(hour.padStart(2, '0'));
            });
        });

        it('should auto-prefix single digit > 2 with zero', () => {
            const testCases = [
                { input: '3', expected: '03' },
                { input: '5', expected: '05' },
                { input: '9', expected: '09' },
            ];

            testCases.forEach((testCase) => {
                const mockEvent = { target: { value: testCase.input } } as any;
                component.onHoursInputChange(mockEvent);
                expect(component.value.hours).toBe(testCase.expected);
            });
        });

        it('should set partialHours for single digit <= 2', () => {
            const testCases = ['0', '1', '2'];

            testCases.forEach((digit) => {
                component.partialHours = null;
                const mockEvent = { target: { value: digit } } as any;
                component.onHoursInputChange(mockEvent);
                expect(component.partialHours).toBe(digit);
            });
        });

        it('should not emit when entering single digit <= 2 (partial state)', () => {
            vi.spyOn(component.valueChange, 'emit');

            const mockEvent = { target: { value: '1' } } as any;
            component.onHoursInputChange(mockEvent);

            expect(component.valueChange.emit).not.toHaveBeenCalled();
            expect(component.partialHours).toBe('1');
        });

        it('should complete partial hours on blur', () => {
            vi.spyOn(component.valueChange, 'emit');

            const mockEvent = { target: { value: '2' } } as any;
            component.onHoursInputChange(mockEvent);
            expect(component.partialHours).toBe('2');

            component.onHoursBlur();

            expect(component.partialHours).toBeNull();
            expect(component.value.hours).toBe('02');
            expect(component.valueChange.emit).toHaveBeenCalled();
        });

        it('should not allow hours above 23 for time mode', () => {
            const invalidHours = [
                { input: '24', expected: '23' },
                { input: '50', expected: '23' },
                { input: '100', expected: '23' },
            ];

            invalidHours.forEach((testCase) => {
                component.value = OwnTime.forTime('00', '00');
                const mockEvent = { target: { value: testCase.input } } as any;
                component.onHoursInputChange(mockEvent);
                expect(component.value.hours).toBe(testCase.expected);
            });
        });

        it('should auto-tab to minutes after two digits', () => {
            vi.useFakeTimers();
            const minutesEl = fixture.nativeElement.querySelector('.time-minute') as HTMLInputElement;
            vi.spyOn(minutesEl, 'focus');

            const mockEvent = { target: { value: '14' } } as any;
            component.onHoursInputChange(mockEvent);
            vi.advanceTimersByTime(0);

            expect(component.value.hours).toBe('14');
            expect(minutesEl.focus).toHaveBeenCalled();
            vi.useRealTimers();
        });

        it('should auto-tab to minutes after single digit > 2', () => {
            vi.useFakeTimers();
            const minutesEl = fixture.nativeElement.querySelector('.time-minute') as HTMLInputElement;
            vi.spyOn(minutesEl, 'focus');

            const mockEvent = { target: { value: '5' } } as any;
            component.onHoursInputChange(mockEvent);
            vi.advanceTimersByTime(0);

            expect(component.value.hours).toBe('05');
            expect(minutesEl.focus).toHaveBeenCalled();
            vi.useRealTimers();
        });

        it('should not auto-tab for single digit <= 2', () => {
            vi.useFakeTimers();
            const minutesEl = fixture.nativeElement.querySelector('.time-minute') as HTMLInputElement;
            vi.spyOn(minutesEl, 'focus');

            const mockEvent = { target: { value: '1' } } as any;
            component.onHoursInputChange(mockEvent);
            vi.advanceTimersByTime(0);

            expect(minutesEl.focus).not.toHaveBeenCalled();
            expect(component.partialHours).toBe('1');
            vi.useRealTimers();
        });
    });

    describe('Duration mode (forDuration = true)', () => {
        beforeEach(() => {
            component.forDuration = true;
            component.value = OwnTime.forDuration('00', '00');
        });

        it('should allow hours above 23 for duration mode', () => {
            const mockEvent = {
                target: { value: '150' },
            } as any;

            component.onHoursInputChange(mockEvent);

            expect(component.value.hours).toBe('150');
        });

        it('should allow up to 999 hours for duration mode', () => {
            const mockEvent = {
                target: { value: '999' },
            } as any;

            component.onHoursInputChange(mockEvent);

            expect(component.value.hours).toBe('999');
        });

        it('should limit hours to 999 for duration mode', () => {
            const mockEvent = {
                target: { value: '1000' },
            } as any;

            component.onHoursInputChange(mockEvent);

            expect(component.value.hours).toBe('999');
        });

        it('should not auto-tab in duration mode', () => {
            vi.useFakeTimers();
            const minutesEl = fixture.nativeElement.querySelector('.time-minute') as HTMLInputElement;
            vi.spyOn(minutesEl, 'focus');

            const mockEvent = { target: { value: '12' } } as any;
            component.onHoursInputChange(mockEvent);
            vi.advanceTimersByTime(0);

            expect(minutesEl.focus).not.toHaveBeenCalled();
            vi.useRealTimers();
        });
    });

    describe('Minutes validation', () => {
        it('should limit minutes to 59', () => {
            const mockEvent = {
                target: { value: '60' },
            } as any;

            component.onMinutesInputChange(mockEvent);

            expect(component.value.minutes).toBe('59');
        });

        it('should handle minutes above 59', () => {
            const testCases = [
                { input: '60', expected: '59' },
                { input: '99', expected: '59' },
                { input: '100', expected: '00' },
            ];

            testCases.forEach((testCase) => {
                const mockEvent = { target: { value: testCase.input } } as any;
                component.onMinutesInputChange(mockEvent);
                expect(component.value.minutes).toBe(testCase.expected);
            });
        });

        it('should pad single digit minutes with zero', () => {
            const mockEvent = {
                target: { value: '5' },
            } as any;

            component.onMinutesInputChange(mockEvent);

            expect(component.value.minutes).toBe('05');
        });

        it('should accept valid minutes 00-59', () => {
            const validMinutes = ['00', '15', '30', '45', '59'];

            validMinutes.forEach((minute) => {
                const mockEvent = { target: { value: minute } } as any;
                component.onMinutesInputChange(mockEvent);
                expect(component.value.minutes).toBe(minute);
            });
        });

        it('should handle multiple digit input correctly', () => {
            const mockEvent = {
                target: { value: '159' },
            } as any;

            component.onMinutesInputChange(mockEvent);

            expect(component.value.minutes).toBe('59');
        });

        it('should handle input "059" as "59"', () => {
            const mockEvent = {
                target: { value: '059' },
            } as any;

            component.onMinutesInputChange(mockEvent);

            expect(component.value.minutes).toBe('59');
        });
    });

    describe('Special input cases', () => {
        it('should handle non-numeric input by removing it', () => {
            component.value = OwnTime.forDuration('00', '00');
            const mockEvent = {
                target: { value: 'abc123def' },
            } as any;

            component.onHoursInputChange(mockEvent);

            expect(component.value.hours).toBe('123');
        });

        it('should handle empty input', () => {
            const mockEvent = {
                target: { value: '' },
            } as any;

            component.onMinutesInputChange(mockEvent);

            expect(component.value.minutes).toBe('00');
        });

        it('should handle leading zeros correctly', () => {
            const mockEvent = {
                target: { value: '005' },
            } as any;

            component.onMinutesInputChange(mockEvent);

            expect(component.value.minutes).toBe('05');
        });
    });

    describe('OwnTime object formatting', () => {
        it('should format time correctly for display', () => {
            component.forDuration = false;
            component.value = OwnTime.forTime('5', '5');
            fixture.detectChanges();

            expect(component.value.hours).toBe('05');
            expect(component.value.minutes).toBe('05');
        });

        it('should maintain duration values without time restrictions', () => {
            component.forDuration = true;
            component.value = OwnTime.forDuration('48', '30');
            fixture.detectChanges();

            expect(component.value.hours).toBe('48');
            expect(component.value.minutes).toBe('30');
        });
    });

    describe('Focus and selection', () => {
        it('should select all text on focus', () => {
            vi.useFakeTimers();
            const hoursInput = fixture.nativeElement.querySelector('.time-hour') as HTMLInputElement;
            hoursInput.value = '12';
            vi.spyOn(hoursInput, 'select');

            component.onFocus({ target: hoursInput } as any);
            vi.advanceTimersByTime(0);

            expect(hoursInput.select).toHaveBeenCalled();
            vi.useRealTimers();
        });

        it('should show partialHours via input event', () => {
            component.forDuration = false;
            component.value = OwnTime.forTime('00', '00');
            fixture.detectChanges();

            const hoursInput = fixture.nativeElement.querySelector('.time-hour') as HTMLInputElement;
            hoursInput.value = '2';
            hoursInput.dispatchEvent(new Event('input'));
            fixture.detectChanges();

            expect(component.partialHours).toBe('2');
            expect(hoursInput.value).toBe('2');
        });

        it('should show formatted hours when value is set', () => {
            fixture.componentRef.setInput('forDuration', false);
            fixture.componentRef.setInput('value', OwnTime.forTime('08', '30'));
            fixture.detectChanges();

            const hoursInput = fixture.nativeElement.querySelector('.time-hour') as HTMLInputElement;
            expect(hoursInput.value).toBe('08');
        });
    });

    describe('Full numpad input flow (forTime)', () => {
        beforeEach(() => {
            component.forDuration = false;
            component.value = OwnTime.forTime('00', '00');
        });

        it('should handle typing "15" as two keystrokes', () => {
            const mockEvent1 = { target: { value: '1' } } as any;
            component.onHoursInputChange(mockEvent1);
            expect(component.partialHours).toBe('1');

            const mockEvent2 = { target: { value: '15' } } as any;
            component.onHoursInputChange(mockEvent2);

            expect(component.partialHours).toBeNull();
            expect(component.value.hours).toBe('15');
        });

        it('should handle typing "08" as two keystrokes', () => {
            const mockEvent1 = { target: { value: '0' } } as any;
            component.onHoursInputChange(mockEvent1);
            expect(component.partialHours).toBe('0');

            const mockEvent2 = { target: { value: '08' } } as any;
            component.onHoursInputChange(mockEvent2);

            expect(component.partialHours).toBeNull();
            expect(component.value.hours).toBe('08');
        });

        it('should handle typing "5" as instant auto-prefix to "05"', () => {
            vi.spyOn(component.valueChange, 'emit');

            const mockEvent = { target: { value: '5' } } as any;
            component.onHoursInputChange(mockEvent);

            expect(component.value.hours).toBe('05');
            expect(component.valueChange.emit).toHaveBeenCalled();
        });

        it('should handle typing "23" correctly', () => {
            const mockEvent1 = { target: { value: '2' } } as any;
            component.onHoursInputChange(mockEvent1);
            expect(component.partialHours).toBe('2');

            const mockEvent2 = { target: { value: '23' } } as any;
            component.onHoursInputChange(mockEvent2);

            expect(component.value.hours).toBe('23');
        });

        it('should clamp "29" to "23"', () => {
            const mockEvent1 = { target: { value: '2' } } as any;
            component.onHoursInputChange(mockEvent1);

            const mockEvent2 = { target: { value: '29' } } as any;
            component.onHoursInputChange(mockEvent2);

            expect(component.value.hours).toBe('23');
        });
    });
});
