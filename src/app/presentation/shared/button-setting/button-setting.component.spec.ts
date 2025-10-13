import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ButtonSettingComponent } from './button-setting.component';
import { OtherGreyComponent } from 'src/app/presentation/icons/icon-other-grey.component';

describe('ButtonSettingComponent', () => {
  let component: ButtonSettingComponent;
  let fixture: ComponentFixture<ButtonSettingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonSettingComponent, OtherGreyComponent]
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

  it('should render other icon', () => {
    fixture.detectChanges();

    const otherIcon = fixture.nativeElement.querySelector('app-icon-other-grey');
    expect(otherIcon).toBeTruthy();
  });

  it('should have proper icon container structure', () => {
    fixture.detectChanges();

    const iconContainer = fixture.nativeElement.querySelector('.btn div');
    expect(iconContainer).toBeTruthy();

    const otherIcon = iconContainer.querySelector('app-icon-other-grey');
    expect(otherIcon).toBeTruthy();
  });

  it('should toggle CSS classes when buttonDisabled changes', () => {
    fixture.componentRef.setInput('buttonDisabled', false);
    fixture.detectChanges();

    const buttonElement = fixture.nativeElement.querySelector('.btn');
    expect(buttonElement.classList.contains('ownStyle-button')).toBe(true);

    fixture.componentRef.setInput('buttonDisabled', true);
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

    // Check other icon
    expect(compiled.querySelector('app-icon-other-grey')).toBeTruthy();
  });
});