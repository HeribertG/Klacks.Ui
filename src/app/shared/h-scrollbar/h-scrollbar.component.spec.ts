import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HScrollbarComponent } from './h-scrollbar.component';
import { ScrollbarService } from 'src/app/services/scrollbar.service';
import { DomSanitizer } from '@angular/platform-browser';
import { NgZone } from '@angular/core';

describe('HScrollbarComponent', () => {
  let component: HScrollbarComponent;
  let fixture: ComponentFixture<HScrollbarComponent>;
  let scrollbarServiceSpy: jasmine.SpyObj<ScrollbarService>;
  let sanitizerSpy: jasmine.SpyObj<DomSanitizer>;

  beforeEach(async () => {
    const scrollbarSpy = jasmine.createSpyObj('ScrollbarService', [
      'calcMetrics',
      'createThumbHorizontal',
    ]);
    const domSanitizerSpy = jasmine.createSpyObj('DomSanitizer', [
      'bypassSecurityTrustHtml',
    ]);

    await TestBed.configureTestingModule({
      declarations: [HScrollbarComponent],
      providers: [
        { provide: ScrollbarService, useValue: scrollbarSpy },
        { provide: DomSanitizer, useValue: domSanitizerSpy },
        NgZone,
      ],
    }).compileComponents();

    scrollbarServiceSpy = TestBed.inject(
      ScrollbarService
    ) as jasmine.SpyObj<ScrollbarService>;
    sanitizerSpy = TestBed.inject(DomSanitizer) as jasmine.SpyObj<DomSanitizer>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HScrollbarComponent);
    component = fixture.componentInstance;

    // Mock canvas and context
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    spyOn(canvas, 'getContext').and.returnValue(ctx);
    component.canvasRef = { nativeElement: canvas } as any;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.value).toBe(0);
    expect(component.maxValue).toBe(365);
    expect(component.visibleValue).toBe(180);
  });

  it('should call ScrollbarService methods on initialization', () => {
    expect(scrollbarServiceSpy.calcMetrics).toHaveBeenCalled();
    expect(scrollbarServiceSpy.createThumbHorizontal).toHaveBeenCalled();
  });

  it('should update metrics when maxValue or visibleValue changes', () => {
    component.maxValue = 500;
    component.ngOnChanges({
      maxValue: {
        currentValue: 500,
        previousValue: 365,
        firstChange: false,
        isFirstChange: () => false,
      },
    });
    expect(scrollbarServiceSpy.calcMetrics).toHaveBeenCalled();
  });

  it('should emit valueChange when updateValue is called with a new value', () => {
    spyOn(component.valueChange, 'emit');
    component.updateValue(50);
    expect(component.valueChange.emit).toHaveBeenCalledWith(50);
  });

  it('should not emit valueChange when updateValue is called with the same value', () => {
    spyOn(component.valueChange, 'emit');
    component.value = 50;
    component.updateValue(50);
    expect(component.valueChange.emit).not.toHaveBeenCalled();
  });

  it('should clamp value within valid range', () => {
    component.maxValue = 100;
    component.visibleValue = 50;
    component.updateValue(-10);
    expect(component.value).toBe(0);
    component.updateValue(150);
    expect(component.value).toBe(100);
  });

  it('should update arrow button states correctly', () => {
    component.value = 0;
    component.updateArrowButtonsState();
    expect(component.disableLeftArrow).toBe(true);
    expect(component.disableRightArrow).toBe(false);

    component.value = component.maxValue - component.visibleValue;
    component.updateArrowButtonsState();
    expect(component.disableLeftArrow).toBe(false);
    expect(component.disableRightArrow).toBe(true);
  });

  // Add more tests as needed for other methods and edge cases
});
