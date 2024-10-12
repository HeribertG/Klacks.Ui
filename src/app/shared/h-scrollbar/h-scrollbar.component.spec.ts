import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { HScrollbarComponent } from './h-scrollbar.component';
import { ScrollbarService } from 'src/app/services/scrollbar.service';
import { DomSanitizer } from '@angular/platform-browser';
import {
  NgZone,
  ChangeDetectorRef,
  ApplicationRef,
  Injector,
} from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';

describe('HScrollbarComponent', () => {
  let component: HScrollbarComponent;
  let fixture: ComponentFixture<HScrollbarComponent>;

  beforeEach(async () => {
    const scrollbarServiceSpy = jasmine.createSpyObj('ScrollbarService', [
      'calcMetrics',
      'createThumbHorizontal',
    ]);
    const mockNgZone = jasmine.createSpyObj('NgZone', [
      'run',
      'runOutsideAngular',
    ]);
    mockNgZone.run.and.callFake((fn: Function) => fn());
    mockNgZone.runOutsideAngular.and.callFake((fn: Function) => fn());

    const mockChangeDetectionScheduler = {
      notify: new BehaviorSubject(null),
      subscribe: jasmine
        .createSpy('subscribe')
        .and.returnValue({ unsubscribe: () => {} }),
      schedule: jasmine.createSpy('schedule'),
      ngOnDestroy: jasmine.createSpy('ngOnDestroy'),
    };

    await TestBed.configureTestingModule({
      declarations: [HScrollbarComponent],
      providers: [
        { provide: ScrollbarService, useValue: scrollbarServiceSpy },
        {
          provide: DomSanitizer,
          useValue: jasmine.createSpyObj('DomSanitizer', [
            'bypassSecurityTrustHtml',
          ]),
        },
        { provide: NgZone, useValue: mockNgZone },
        {
          provide: ChangeDetectorRef,
          useValue: jasmine.createSpyObj('ChangeDetectorRef', [
            'detectChanges',
            'markForCheck',
          ]),
        },
        {
          provide: ApplicationRef,
          useValue: jasmine.createSpyObj('ApplicationRef', {
            tick: null,
            isStable: of(true),
          }),
        },
        {
          provide: Injector,
          useFactory: () => {
            const injector = TestBed.inject(Injector);
            spyOn(injector, 'get').and.callFake(
              (token: any, notFoundValue?: any) => {
                if (token === 'ChangeDetectionScheduler') {
                  return mockChangeDetectionScheduler;
                }
                return injector.get(token, notFoundValue);
              }
            );
            return injector;
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HScrollbarComponent);
    component = fixture.componentInstance;
  });

  it('should create', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(component).toBeTruthy();
  }));

  it('should emit valueChange when value is updated', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    spyOn(component.valueChange, 'emit');
    component.value = 50;
    fixture.detectChanges();
    tick();

    expect(component.valueChange.emit).toHaveBeenCalledWith(50);
  }));

  it('should not emit valueChange when the same value is set', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.value = 50;
    fixture.detectChanges();
    tick();

    spyOn(component.valueChange, 'emit');
    component.value = 50;
    fixture.detectChanges();
    tick();

    expect(component.valueChange.emit).not.toHaveBeenCalled();
  }));

  // Fügen Sie hier weitere Tests hinzu...
});
