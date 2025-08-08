/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HScrollbarComponent } from './h-scrollbar.component';
import { DomSanitizer } from '@angular/platform-browser';
import { ElementRef, NgZone } from '@angular/core';
import { ScrollbarService } from '../scrollbar/scrollbar.service';
import { SCROLLBAR_CONSTANTS } from '../scrollbar/constants';

describe('HScrollbarComponent', () => {
  let component: HScrollbarComponent;
  let fixture: ComponentFixture<HScrollbarComponent>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let scrollbarService: jasmine.SpyObj<ScrollbarService>;
  let domSanitizer: jasmine.SpyObj<DomSanitizer>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let ngZone: NgZone;

  beforeEach(async () => {
    // Mock ScrollbarService
    const scrollbarServiceSpy = jasmine.createSpyObj(
      'ScrollbarService',
      ['calcMetrics', 'createThumbHorizontal'],
      {
        triangleLeftSvg: '<svg>left</svg>',
        triangleRightSvg: '<svg>right</svg>',
      }
    );

    // Mock DomSanitizer
    const domSanitizerSpy = jasmine.createSpyObj('DomSanitizer', [
      'bypassSecurityTrustHtml',
    ]);

    // Mock Methoden für ScrollbarService konfigurieren
    scrollbarServiceSpy.calcMetrics.and.returnValue({
      thumbLength: 100,
      tickSize: 10,
    });

    scrollbarServiceSpy.createThumbHorizontal.and.callFake(() => {
      // Mock-Logik hier hinzufügen, falls benötigt
    });

    // Mock DomSanitizer
    domSanitizerSpy.bypassSecurityTrustHtml.and.returnValue('safe html' as any);

    // Testmodule konfigurieren
    await TestBed.configureTestingModule({
      imports: [HScrollbarComponent], // Standalone Component in imports!
      providers: [
        { provide: ScrollbarService, useValue: scrollbarServiceSpy },
        { provide: DomSanitizer, useValue: domSanitizerSpy },
        // NgZone und ChangeDetectorRef werden automatisch bereitgestellt
      ],
    }).compileComponents();

    scrollbarService = TestBed.inject(
      ScrollbarService
    ) as jasmine.SpyObj<ScrollbarService>;
    domSanitizer = TestBed.inject(DomSanitizer) as jasmine.SpyObj<DomSanitizer>;
    ngZone = TestBed.inject(NgZone);

    fixture = TestBed.createComponent(HScrollbarComponent);
    component = fixture.componentInstance;

    // Mock canvas element
    const mockCanvas = document.createElement('canvas');
    const mockContext = jasmine.createSpyObj('CanvasRenderingContext2D', [
      'clearRect',
      'putImageData',
      'save',
      'restore',
    ]);

    spyOn(mockCanvas, 'getContext').and.returnValue(mockContext);

    // Mock canvas properties
    Object.defineProperty(mockCanvas, 'width', { value: 500, writable: true });
    Object.defineProperty(mockCanvas, 'height', { value: 50, writable: true });
    Object.defineProperty(mockCanvas, 'offsetWidth', {
      value: 500,
      writable: true,
    });
    Object.defineProperty(mockCanvas, 'offsetHeight', {
      value: 50,
      writable: true,
    });
    Object.defineProperty(mockCanvas, 'offsetLeft', {
      value: 0,
      writable: true,
    });

    component.canvasRef = {
      nativeElement: mockCanvas,
    } as ElementRef<HTMLCanvasElement>;

    // Prevent actual DOM manipulation during tests
    spyOn(component, 'refresh').and.stub();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.value).toBe(0);
    expect(component.maxValue).toBe(365);
    expect(component.visibleValue).toBe(180);
  });

  it('should clamp value within valid range', () => {
    component.maxValue = 100;
    component.visibleValue = 18;

    // Test upper bound - korrigierte Berechnung basierend auf der tatsächlichen Implementierung
    const maxAllowedValue =
      component.maxValue -
      component.visibleValue +
      SCROLLBAR_CONSTANTS.TICKS_OUTSIDE_RANGE;

    component.value = 200;
    expect(component.value).toBeLessThanOrEqual(maxAllowedValue);

    // Test lower bound
    component.value = -10;
    expect(component.value).toBe(0);
  });

  it('should emit valueChange when value changes', () => {
    spyOn(component.valueChange, 'emit');

    component.value = 50;

    expect(component.valueChange.emit).toHaveBeenCalledWith(50);
  });

  it('should update metrics on refresh', () => {
    // Remove the stub for this specific test
    (component.refresh as jasmine.Spy).and.callThrough();
    spyOn(component as any, 'updateMetrics').and.stub();

    component.refresh();

    expect((component as any).updateMetrics).toHaveBeenCalled();
  });

  it('should correctly calculate X position for the thumb', () => {
    const mockCanvas = component.canvasRef.nativeElement;
    mockCanvas.width = 500;
    
    // Setup component values to match the test scenario
    component.maxValue = 100;
    component.visibleValue = 20;
    
    // value = 10, maxScrollValue = 100 - 20 = 80
    // proportion = 10 / 80 = 0.125
    // availableSpace = 500 - 50 = 450
    // result = 0.125 * 450 = 56.25, rounded = 56
    const result = (component as any).calculateXPosition(
      mockCanvas,
      10,
      10,
      50
    );
    expect(result).toBe(56);
  });

  it('should handle canvas width constraint in calculateXPosition', () => {
    const mockCanvas = component.canvasRef.nativeElement;
    mockCanvas.width = 200;
    
    // Setup component values
    component.maxValue = 100;
    component.visibleValue = 20;
    
    // When value >= maxScrollValue, should position at the end
    // maxScrollValue = 100 - 20 = 80
    // value = 80 or more should place thumb at canvas.width - trackWidth
    const result = (component as any).calculateXPosition(
      mockCanvas,
      80, // value at max scroll
      10, // tickSize
      100 // trackWidth
    );

    // Should place at canvas width - trackWidth when at max scroll
    expect(result).toBe(100); // 200 - 100 = 100
  });

  it('should disable arrow buttons at boundaries', () => {
    // Entferne den refresh mock für diesen Test
    (component.refresh as jasmine.Spy).and.callThrough();

    component.maxValue = 100;
    component.visibleValue = 20;

    // At start
    component.value = 0;
    expect((component as any).isAtStart()).toBe(true);
    expect((component as any).isAtEnd()).toBe(false);

    // At end
    component.value = 80; // maxValue - visibleValue = 100 - 20 = 80
    expect((component as any).isAtStart()).toBe(false);
    expect((component as any).isAtEnd()).toBe(true);
  });

  it('should initialize safe SVG content', () => {
    component.ngOnInit();

    expect(domSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(
      '<svg>left</svg>'
    );
    expect(domSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(
      '<svg>right</svg>'
    );
  });

  it('should handle isAtStart correctly', () => {
    component.value = 0;
    expect((component as any).isAtStart()).toBe(true);

    component.value = 1;
    expect((component as any).isAtStart()).toBe(false);

    // Test with negative value - should be clamped to 0 by the setter
    component.value = -5;
    expect(component.value).toBe(0); // Verify it was clamped
    expect((component as any).isAtStart()).toBe(true); // Should be true because value is now 0
  });

  it('should handle isAtEnd correctly', () => {
    component.maxValue = 100;
    component.visibleValue = 20;

    // Test exact boundary
    component.value = 80; // maxValue - visibleValue = 100 - 20 = 80
    expect((component as any).isAtEnd()).toBe(true);

    // Test just before boundary
    component.value = 79;
    expect((component as any).isAtEnd()).toBe(false);

    // Test beyond boundary
    component.value = 85;
    expect((component as any).isAtEnd()).toBe(true);
  });
});
