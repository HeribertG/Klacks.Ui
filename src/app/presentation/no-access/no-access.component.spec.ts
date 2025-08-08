import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { Component } from '@angular/core';

import { NoAccessComponent } from './no-access.component';
import { NavigationService } from '../../services/navigation.service';

@Component({
  template: '<div>Test Component</div>'
})
class TestComponent { }

describe('NoAccessComponent', () => {
  let component: NoAccessComponent;
  let fixture: ComponentFixture<NoAccessComponent>;
  let navigationService: jasmine.SpyObj<NavigationService>;
  let translateService: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    const navigationServiceSpy = jasmine.createSpyObj('NavigationService', ['navigateToRoot']);

    await TestBed.configureTestingModule({
      imports: [
        NoAccessComponent,
        TranslateModule.forRoot(),
        RouterTestingModule.withRoutes([
          { path: '', component: TestComponent }
        ])
      ],
      providers: [
        { provide: NavigationService, useValue: navigationServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NoAccessComponent);
    component = fixture.componentInstance;
    navigationService = TestBed.inject(NavigationService) as jasmine.SpyObj<NavigationService>;
    translateService = TestBed.inject(TranslateService) as jasmine.SpyObj<TranslateService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have NavigationService injected', () => {
    expect(component['navigationService']).toBeTruthy();
  });

  it('should have TranslateService injected', () => {
    expect(component.translate).toBeTruthy();
  });

  it('should call navigationService.navigateToRoot when onClick is called', () => {
    component.onClick();
    
    expect(navigationService.navigateToRoot).toHaveBeenCalled();
  });

  it('should render lock icon SVG', () => {
    fixture.detectChanges();
    
    const svgElement = fixture.nativeElement.querySelector('svg');
    expect(svgElement).toBeTruthy();
    expect(svgElement.getAttribute('width')).toBe('120');
    expect(svgElement.getAttribute('height')).toBe('120');
    expect(svgElement.getAttribute('viewBox')).toBe('0 0 24 24');
  });

  it('should render no-access message with translation', () => {
    fixture.detectChanges();
    
    const messageElement = fixture.nativeElement.querySelector('.message');
    expect(messageElement).toBeTruthy();
    expect(messageElement.textContent.trim()).toContain('no-access.message');
  });

  it('should render button with translation and click handler', () => {
    fixture.detectChanges();
    
    const buttonElement = fixture.nativeElement.querySelector('button');
    expect(buttonElement).toBeTruthy();
    expect(buttonElement.classList.contains('btn')).toBe(true);
    expect(buttonElement.classList.contains('btn-primary')).toBe(true);
    expect(buttonElement.classList.contains('center')).toBe(true);
    expect(buttonElement.textContent.trim()).toContain('error.button');
  });

  it('should call onClick when button is clicked', () => {
    spyOn(component, 'onClick');
    fixture.detectChanges();
    
    const buttonElement = fixture.nativeElement.querySelector('button');
    buttonElement.click();
    
    expect(component.onClick).toHaveBeenCalled();
  });

  it('should have proper container CSS class', () => {
    fixture.detectChanges();
    
    const containerElement = fixture.nativeElement.querySelector('.no-access-container');
    expect(containerElement).toBeTruthy();
  });

  it('should have complete template structure', () => {
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    
    // Check main container
    expect(compiled.querySelector('.no-access-container')).toBeTruthy();
    
    // Check SVG icon
    expect(compiled.querySelector('svg')).toBeTruthy();
    
    // Check message paragraph
    expect(compiled.querySelector('.message')).toBeTruthy();
    
    // Check empty paragraphs for spacing
    const paragraphs = compiled.querySelectorAll('p');
    expect(paragraphs.length).toBeGreaterThanOrEqual(3);
    
    // Check button
    expect(compiled.querySelector('button')).toBeTruthy();
  });

  it('should have lock icon with proper path and styling', () => {
    fixture.detectChanges();
    
    const pathElement = fixture.nativeElement.querySelector('svg path');
    expect(pathElement).toBeTruthy();
    expect(pathElement.getAttribute('fill')).toBe('var(--iconStandartColor)');
    expect(pathElement.getAttribute('d')).toContain('M6 10V8C6 4.6863');
  });
});