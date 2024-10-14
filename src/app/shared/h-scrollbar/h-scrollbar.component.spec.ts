import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { HScrollbarComponent } from './h-scrollbar.component';
import { ScrollbarService } from 'src/app/services/scrollbar.service';
import { DomSanitizer } from '@angular/platform-browser';
import { NgZone } from '@angular/core';
import { GridColorService } from 'src/app/grid/services/grid-color.service';

describe('HScrollbarComponent', () => {
  let component: HScrollbarComponent;
  let fixture: ComponentFixture<HScrollbarComponent>;
  let scrollbarService: jasmine.SpyObj<ScrollbarService>;
  let ngZone: NgZone;

  beforeEach(async () => {
    const scrollbarServiceSpy = jasmine.createSpyObj('ScrollbarService', [
      'calcMetrics',
      'createThumbHorizontal',
    ]);

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
        NgZone,
      ],
    }).compileComponents();

    scrollbarService = TestBed.inject(
      ScrollbarService
    ) as jasmine.SpyObj<ScrollbarService>;
    ngZone = TestBed.inject(NgZone);

    fixture = TestBed.createComponent(HScrollbarComponent);
    component = fixture.componentInstance;

    // Mock canvas element
    const mockCanvas = document.createElement('canvas');
    const mockContext = mockCanvas.getContext('2d');
    spyOn(mockCanvas, 'getContext').and.returnValue(mockContext);
    component.canvasRef = { nativeElement: mockCanvas } as any;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit valueChange when value is updated', fakeAsync(() => {
    let emittedValue: number | undefined;
    component.valueChange.subscribe((value) => (emittedValue = value));

    ngZone.run(() => {
      component.value = 50;
      fixture.detectChanges();
    });

    tick(); // This processes pending asynchronous activities

    expect(emittedValue).toBe(50);
  }));

  it('should not emit valueChange when the same value is set', fakeAsync(() => {
    let emitCount = 0;
    component.valueChange.subscribe(() => emitCount++);

    ngZone.run(() => {
      component.value = 50;
      fixture.detectChanges();
      component.value = 50;
      fixture.detectChanges();
    });

    tick(); // This processes pending asynchronous activities

    expect(emitCount).toBe(1);
  }));

  // Fügen Sie hier weitere Tests hinzu...
});
