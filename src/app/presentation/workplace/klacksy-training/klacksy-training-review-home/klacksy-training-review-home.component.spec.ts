// Copyright (c) Heribert Gasparoli Private. All rights reserved.
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';
import { KlacksyTrainingReviewHomeComponent } from './klacksy-training-review-home.component';
import { DataKlacksyTrainingService } from '../../../../infrastructure/api/klacksy-training/data-klacksy-training.service';
import { DataManagementSkillEffectivenessService } from 'src/app/domain/services/assistant/data-management-skill-effectiveness.service';
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

  // Stub effectiveness service with minimal data structure for template rendering
  const effectivenessServiceStub = {
    getSkillEffectiveness: () => of({
      days: 30,
      evalTrend: [],
      recipeFunnel: [],
      failureSummary: { totalRows: 0, notFound: 0, permissionDenied: 0, parameterInvalid: 0, gateHold: 0, uiActionContext: 0, exception: 0, hallucinationRate: 0 },
      topSkills: [],
      flopSkills: [],
      chosenSourceDistribution: [],
    }),
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
        { provide: DataManagementSkillEffectivenessService, useValue: effectivenessServiceStub },
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

  it('switches to the effectiveness tab when its nav-link is clicked', () => {
    fixture.detectChanges();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('#klacksy-training-tab-effectiveness');
    link.click();
    fixture.detectChanges();
    expect(link.classList.contains('active')).toBe(true);
  });

  it('activates the effectiveness tab when Klacksy requests the skill-effectiveness target', () => {
    targetRequested$.next({ target: 'skill-effectiveness' });

    expect(component['activeTab']()).toBe('effectiveness');
  });
});
