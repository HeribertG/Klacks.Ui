import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ButtonNewComponent } from './button-new.component';

describe('ButtonNewComponent', () => {
  let component: ButtonNewComponent;
  let fixture: ComponentFixture<ButtonNewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonNewComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonNewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render button with correct classes', () => {
    fixture.detectChanges();

    const buttonElement = fixture.nativeElement.querySelector('button');
    expect(buttonElement).toBeTruthy();
    expect(buttonElement.classList.contains('btn')).toBe(true);
    expect(buttonElement.classList.contains('ownStyle-button')).toBe(true);
  });

  it('should have correct button role', () => {
    fixture.detectChanges();

    const buttonElement = fixture.nativeElement.querySelector('button');
    expect(buttonElement.getAttribute('role')).toBe('button');
  });

  it('should render SVG icon', () => {
    fixture.detectChanges();

    const svgElement = fixture.nativeElement.querySelector('svg');
    expect(svgElement).toBeTruthy();
    expect(svgElement.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svgElement.getAttribute('width')).toBe('16');
    expect(svgElement.getAttribute('height')).toBe('16');
  });

  it('should have correct SVG path', () => {
    fixture.detectChanges();

    const pathElement = fixture.nativeElement.querySelector('svg path');
    expect(pathElement).toBeTruthy();
    expect(pathElement.getAttribute('d')).toContain('M14 10H2v2h12v-2z');
    expect(pathElement.style.fill).toBe('rgb(27, 197, 189)');
  });

  it('should have proper styling structure', () => {
    fixture.detectChanges();

    const iconContainer = fixture.nativeElement.querySelector('button div');
    expect(iconContainer).toBeTruthy();
    expect(iconContainer.style.marginTop).toBe('-2px');
    expect(iconContainer.style.marginLeft).toBe('-2px');
  });

  it('should have correct SVG attributes', () => {
    fixture.detectChanges();

    const svgElement = fixture.nativeElement.querySelector('svg');
    const pathElement = fixture.nativeElement.querySelector('svg path');
    expect(svgElement.getAttribute('version')).toBe('1.2');
    expect(svgElement.getAttribute('overflow')).toBe('visible');
    expect(svgElement.getAttribute('preserveAspectRatio')).toBe('none');
    expect(pathElement.getAttribute('vector-effect')).toBe('non-scaling-stroke');
  });

  it('should have complete template structure', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    
    // Check button exists
    expect(compiled.querySelector('button')).toBeTruthy();
    
    // Check div container
    expect(compiled.querySelector('button div')).toBeTruthy();
    
    // Check SVG and path
    expect(compiled.querySelector('svg')).toBeTruthy();
    expect(compiled.querySelector('svg g')).toBeTruthy();
    expect(compiled.querySelector('svg path')).toBeTruthy();
  });
});