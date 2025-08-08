import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ButtonSettingComponent } from './button-setting.component';
import { GearGreyComponent } from 'src/app/presentation/icons/gear-grey.component';

describe('ButtonSettingComponent', () => {
  let component: ButtonSettingComponent;
  let fixture: ComponentFixture<ButtonSettingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonSettingComponent, GearGreyComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonSettingComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default buttonDisabled value as false', () => {
    expect(component.buttonDisabled).toBe(false);
  });

  it('should accept buttonDisabled input', () => {
    component.buttonDisabled = true;
    expect(component.buttonDisabled).toBe(true);
  });

  it('should apply ownStyle-button class when buttonDisabled is false', () => {
    component.buttonDisabled = false;
    fixture.detectChanges();

    const buttonElement = fixture.nativeElement.querySelector('.btn');
    expect(buttonElement.classList.contains('ownStyle-button')).toBe(true);
    expect(buttonElement.classList.contains('ownStyle-button-disabled')).toBe(false);
  });

  it('should apply ownStyle-button-disabled class when buttonDisabled is true', () => {
    component.buttonDisabled = true;
    fixture.detectChanges();

    const buttonElement = fixture.nativeElement.querySelector('.btn');
    expect(buttonElement.classList.contains('ownStyle-button')).toBe(false);
    expect(buttonElement.classList.contains('ownStyle-button-disabled')).toBe(true);
  });

  it('should have proper button structure', () => {
    fixture.detectChanges();

    const buttonElement = fixture.nativeElement.querySelector('.btn');
    expect(buttonElement).toBeTruthy();
    expect(buttonElement.getAttribute('role')).toBe('button');
  });

  it('should render gear icon', () => {
    fixture.detectChanges();

    const gearIcon = fixture.nativeElement.querySelector('app-icon-gear-grey');
    expect(gearIcon).toBeTruthy();
  });

  it('should have proper icon container structure', () => {
    fixture.detectChanges();

    const iconContainer = fixture.nativeElement.querySelector('.btn div');
    expect(iconContainer).toBeTruthy();
    
    const gearIcon = iconContainer.querySelector('app-icon-gear-grey');
    expect(gearIcon).toBeTruthy();
  });

  it('should toggle CSS classes when buttonDisabled changes', () => {
    // Initially disabled is false
    component.buttonDisabled = false;
    fixture.detectChanges();
    
    const buttonElement = fixture.nativeElement.querySelector('.btn');
    expect(buttonElement.classList.contains('ownStyle-button')).toBe(true);

    // Change to disabled
    component.buttonDisabled = true;
    fixture.detectChanges();
    
    expect(buttonElement.classList.contains('ownStyle-button')).toBe(false);
    expect(buttonElement.classList.contains('ownStyle-button-disabled')).toBe(true);
  });

  it('should have complete template structure', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    
    // Check button exists
    expect(compiled.querySelector('.btn')).toBeTruthy();
    
    // Check div container
    expect(compiled.querySelector('.btn div')).toBeTruthy();
    
    // Check gear icon
    expect(compiled.querySelector('app-icon-gear-grey')).toBeTruthy();
  });
});