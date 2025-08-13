import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TimeInputComponent } from './time-input.component';
import { OwnTime } from 'src/app/domain/models/schedule-class';

describe('TimeInputComponent', () => {
  let component: TimeInputComponent;
  let fixture: ComponentFixture<TimeInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeInputComponent, FormsModule]
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
    spyOn(component.valueChange, 'emit');
    spyOn(component.timeChange, 'emit');

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
      target: { value: '12' }
    } as any;

    spyOn(component.valueChange, 'emit');
    spyOn(component.timeChange, 'emit');

    component.onHoursInputChange(mockEvent);

    expect(component.value.hours).toBe('12');
    expect(component.value.minutes).toBe('15');
    expect(component.valueChange.emit).toHaveBeenCalled();
    expect(component.timeChange.emit).toHaveBeenCalled();
  });

  it('should handle hours input change for time', () => {
    component.forDuration = false;
    component.value = OwnTime.forTime('05', '15');

    const mockEvent = {
      target: { value: '12' }
    } as any;

    spyOn(component.valueChange, 'emit');
    spyOn(component.timeChange, 'emit');

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
      target: { value: '45' }
    } as any;

    spyOn(component.valueChange, 'emit');
    spyOn(component.timeChange, 'emit');

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
      target: { value: '45' }
    } as any;

    spyOn(component.valueChange, 'emit');
    spyOn(component.timeChange, 'emit');

    component.onMinutesInputChange(mockEvent);

    expect(component.value.hours).toBe('10');
    expect(component.value.minutes).toBe('45');
    expect(component.valueChange.emit).toHaveBeenCalled();
    expect(component.timeChange.emit).toHaveBeenCalled();
  });

  it('should emit keyUp event when onInputKeyUp is called', () => {
    spyOn(component.keyUp, 'emit');

    const mockEvent = new KeyboardEvent('keyup');
    component.onInputKeyUp(mockEvent);

    expect(component.keyUp.emit).toHaveBeenCalledWith(mockEvent);
  });

  it('should display label when showLabel is true', () => {
    component.showLabel = true;
    component.label = 'Test Label';
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
    component.showLabel = true;
    component.label = 'Test Label';
    component.labelAlign = 'center';
    fixture.detectChanges();

    const labelElement = fixture.nativeElement.querySelector('label[for]');
    expect(labelElement.style.textAlign).toBe('center');
  });

  it('should set input values correctly', () => {
    component.value = OwnTime.forDuration('123', '45');
    fixture.detectChanges();

    const hoursInput = fixture.nativeElement.querySelector('.time-hour');
    const minutesInput = fixture.nativeElement.querySelector('.time-minute');

    expect(hoursInput.value).toBe('123');
    expect(minutesInput.value).toBe('45');
  });

  it('should disable inputs when disabled is true', () => {
    component.disabled = true;
    fixture.detectChanges();

    const hoursInput = fixture.nativeElement.querySelector('.time-hour');
    const minutesInput = fixture.nativeElement.querySelector('.time-minute');

    expect(hoursInput.disabled).toBe(true);
    expect(minutesInput.disabled).toBe(true);
  });

  it('should handle invalid input gracefully', () => {
    const mockEvent = {
      target: { value: 'invalid' }
    } as any;

    spyOn(component.valueChange, 'emit');
    
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
        target: { value: '25' }
      } as any;

      component.onHoursInputChange(mockEvent);

      expect(component.value.hours).toBe('23');
    });

    it('should accept hours 0-23 for time mode', () => {
      const validHours = ['0', '5', '12', '23'];
      
      validHours.forEach(hour => {
        const mockEvent = { target: { value: hour } } as any;
        component.onHoursInputChange(mockEvent);
        expect(component.value.hours).toBe(hour.padStart(2, '0'));
      });
    });

    it('should not allow hours above 23 for time mode', () => {
      const invalidHours = [
        { input: '24', expected: '23' },
        { input: '50', expected: '23' },
        { input: '100', expected: '23' }  // slice(-2) = '00', aber time mode limit auf 23
      ];
      
      invalidHours.forEach(testCase => {
        component.value = OwnTime.forTime('00', '00'); // Reset
        const mockEvent = { target: { value: testCase.input } } as any;
        component.onHoursInputChange(mockEvent);
        expect(component.value.hours).toBe(testCase.expected);
      });
    });
  });

  describe('Duration mode (forDuration = true)', () => {
    beforeEach(() => {
      component.forDuration = true;
      component.value = OwnTime.forDuration('00', '00');
    });

    it('should allow hours above 23 for duration mode', () => {
      const mockEvent = {
        target: { value: '150' }
      } as any;

      component.onHoursInputChange(mockEvent);

      expect(component.value.hours).toBe('150');
    });

    it('should allow up to 999 hours for duration mode', () => {
      const mockEvent = {
        target: { value: '999' }
      } as any;

      component.onHoursInputChange(mockEvent);

      expect(component.value.hours).toBe('999');
    });

    it('should limit hours to 999 for duration mode', () => {
      const mockEvent = {
        target: { value: '1000' }
      } as any;

      component.onHoursInputChange(mockEvent);

      expect(component.value.hours).toBe('999');
    });
  });

  describe('Minutes validation', () => {
    it('should limit minutes to 59', () => {
      const mockEvent = {
        target: { value: '60' }
      } as any;

      component.onMinutesInputChange(mockEvent);

      expect(component.value.minutes).toBe('59');
    });

    it('should handle minutes above 59', () => {
      const testCases = [
        { input: '60', expected: '59' },
        { input: '99', expected: '59' },
        { input: '100', expected: '00' }  // slice(-2) = '00', dann check > 59
      ];
      
      testCases.forEach(testCase => {
        const mockEvent = { target: { value: testCase.input } } as any;
        component.onMinutesInputChange(mockEvent);
        expect(component.value.minutes).toBe(testCase.expected);
      });
    });

    it('should pad single digit minutes with zero', () => {
      const mockEvent = {
        target: { value: '5' }
      } as any;

      component.onMinutesInputChange(mockEvent);

      expect(component.value.minutes).toBe('05');
    });

    it('should accept valid minutes 00-59', () => {
      const validMinutes = ['00', '15', '30', '45', '59'];
      
      validMinutes.forEach(minute => {
        const mockEvent = { target: { value: minute } } as any;
        component.onMinutesInputChange(mockEvent);
        expect(component.value.minutes).toBe(minute);
      });
    });

    it('should handle multiple digit input correctly', () => {
      // Test slice(-2) functionality
      const mockEvent = {
        target: { value: '159' }
      } as any;

      component.onMinutesInputChange(mockEvent);

      expect(component.value.minutes).toBe('59');
    });

    it('should handle input "059" as "59"', () => {
      const mockEvent = {
        target: { value: '059' }
      } as any;

      component.onMinutesInputChange(mockEvent);

      expect(component.value.minutes).toBe('59');
    });
  });

  describe('Special input cases', () => {
    it('should handle non-numeric input by removing it', () => {
      component.value = OwnTime.forDuration('00', '00'); // Reset
      const mockEvent = {
        target: { value: 'abc123def' }
      } as any;

      component.onHoursInputChange(mockEvent);

      expect(component.value.hours).toBe('123');
    });

    it('should handle empty input', () => {
      const mockEvent = {
        target: { value: '' }
      } as any;

      component.onMinutesInputChange(mockEvent);

      expect(component.value.minutes).toBe('00');
    });

    it('should handle leading zeros correctly', () => {
      const mockEvent = {
        target: { value: '005' }
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
});