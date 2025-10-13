import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ButtonExcelComponent } from './button-excel.component';
import { ExcelComponent } from 'src/app/presentation/icons/excel.component';

describe('ButtonExcelComponent', () => {
  let component: ButtonExcelComponent;
  let fixture: ComponentFixture<ButtonExcelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonExcelComponent, ExcelComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonExcelComponent);
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

  it('should render Excel icon', () => {
    fixture.detectChanges();

    const excelIcon = fixture.nativeElement.querySelector('app-excel-icon');
    expect(excelIcon).toBeTruthy();
  });

  it('should have proper styling structure', () => {
    fixture.detectChanges();

    const iconContainer = fixture.nativeElement.querySelector('.btn div');
    expect(iconContainer).toBeTruthy();
    expect(iconContainer.style.marginTop).toBe('-2px');
    expect(iconContainer.style.marginLeft).toBe('-7px');
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
});