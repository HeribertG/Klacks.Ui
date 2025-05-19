import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HScrollbarComponent } from './h-scrollbar.component';
import { DomSanitizer } from '@angular/platform-browser';
import { GridColorService } from 'src/app/grid/services/grid-color.service';
import { ElementRef } from '@angular/core';
import { ScrollbarService } from '../scrollbar/scrollbar.service';

describe('HScrollbarComponent', () => {
  let component: HScrollbarComponent;
  let fixture: ComponentFixture<HScrollbarComponent>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let scrollbarService: jasmine.SpyObj<ScrollbarService>;

  beforeEach(async () => {
    // Mock ScrollbarService
    const scrollbarServiceSpy = jasmine.createSpyObj('ScrollbarService', [
      'calcMetrics',
      'createThumbHorizontal',
    ]);

    // Mock Methoden für ScrollbarService konfigurieren
    scrollbarServiceSpy.calcMetrics.and.returnValue({
      thumbLength: 100,
      tickSize: 10,
    });

    scrollbarServiceSpy.createThumbHorizontal.and.callFake(() => {
      // Mock-Logik hier hinzufügen, falls benötigt
    });

    // Testmodule konfigurieren
    await TestBed.configureTestingModule({
      declarations: [HScrollbarComponent],
      providers: [
        { provide: ScrollbarService, useValue: scrollbarServiceSpy },
        {
          provide: GridColorService,
          useValue: jasmine.createSpyObj('GridColorService', ['getColor']),
        },
        {
          provide: DomSanitizer,
          useValue: jasmine.createSpyObj('DomSanitizer', [
            'bypassSecurityTrustHtml',
          ]),
        },
      ],
    }).compileComponents();

    scrollbarService = TestBed.inject(
      ScrollbarService
    ) as jasmine.SpyObj<ScrollbarService>;

    fixture = TestBed.createComponent(HScrollbarComponent);
    component = fixture.componentInstance;

    // Mock canvas element
    const mockCanvas = document.createElement('canvas');
    const mockContext = mockCanvas.getContext('2d');
    spyOn(mockCanvas, 'getContext').and.returnValue(mockContext);
    component.canvasRef = {
      nativeElement: mockCanvas,
    } as ElementRef<HTMLCanvasElement>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update metrics on refresh', () => {
    spyOn(component as never, 'updateMetrics');
    component.refresh();
    expect((component as any).updateMetrics).toHaveBeenCalled();
  });

  it('should correctly calculate X position for the thumb', () => {
    const mockCanvas = component.canvasRef.nativeElement;
    mockCanvas.width = 500;
    const result = (component as any).calculateXPosition(
      mockCanvas,
      10,
      10,
      50
    );
    expect(result).toBe(100);
  });
});
