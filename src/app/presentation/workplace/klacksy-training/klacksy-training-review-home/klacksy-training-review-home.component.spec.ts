// Copyright (c) Heribert Gasparoli Private. All rights reserved.
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';
import { KlacksyTrainingReviewHomeComponent } from './klacksy-training-review-home.component';
import { DataKlacksyTrainingService } from '../../../../infrastructure/api/klacksy-training/data-klacksy-training.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';

describe('KlacksyTrainingReviewHomeComponent', () => {
  let fixture: ComponentFixture<KlacksyTrainingReviewHomeComponent>;
  let component: KlacksyTrainingReviewHomeComponent;
  let eventBusMock: { emit: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn>; onAny: ReturnType<typeof vi.fn> };
  let targetRequested$: Subject<{ target: string }>;

  // Stub the training service so the rendered tab children (review/feedback/metrics) never make real HTTP
  // calls in their ngOnInit. Without this the spec leaks fetches to /admin/klacksy-training/* which pollute
  // the worker and fail unrelated tests downstream.
  const trainingServiceStub = {
    listTargets: () => of([]),
    listFeedback: () => of([]),
    updateSynonyms: () => of(true),
  };

  beforeEach(() => {
    targetRequested$ = new Subject<{ target: string }>();
    eventBusMock = {
      emit: vi.fn(),
      on: vi.fn().mockReturnValue(targetRequested$.asObservable()),
      onAny: vi.fn().mockReturnValue(new Subject()),
    };

    TestBed.configureTestingModule({
      imports: [KlacksyTrainingReviewHomeComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataKlacksyTrainingService, useValue: trainingServiceStub },
        { provide: EVENT_BUS_TOKEN, useValue: eventBusMock },
      ]
    });
    fixture = TestBed.createComponent(KlacksyTrainingReviewHomeComponent);
    component = fixture.componentInstance;
  });

  it('switches tab when nav-link clicked', () => {
    fixture.detectChanges();
    const links: HTMLAnchorElement[] = fixture.nativeElement.querySelectorAll('#klacksy-training-tabs .nav-link');
    links[1].click();
    fixture.detectChanges();
    expect(links[1].classList.contains('active')).toBe(true);
  });

  it('activates the owning tab when Klacksy requests a known target', () => {
    targetRequested$.next({ target: 'klacksy-training.feedback' });

    expect(component['activeTab']()).toBe('feedback');
  });

  it('ignores target requests for pages other than the training review', () => {
    targetRequested$.next({ target: 'goal-candidates-panel.approve' });

    expect(component['activeTab']()).toBe('targets');
  });
});
