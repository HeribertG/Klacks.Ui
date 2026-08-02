// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed, signal, Signal, WritableSignal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, Subject, throwError } from 'rxjs';

import { GoalCandidatesPanelComponent } from './goal-candidates-panel.component';
import { DataManagementGoalCandidatesService } from 'src/app/domain/services/assistant/data-management-goal-candidates.service';
import { AsideService } from '../../aside.service';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { IGoalCandidate } from 'src/app/domain/interfaces/goal-candidate.interface';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';

describe('GoalCandidatesPanelComponent', () => {
  let fixture: ComponentFixture<GoalCandidatesPanelComponent>;
  let component: GoalCandidatesPanelComponent;
  let goalCandidatesServiceMock: {
    candidates: WritableSignal<IGoalCandidate[]>;
    hasCandidates: Signal<boolean>;
    loadCandidates: ReturnType<typeof vi.fn>;
    approve: ReturnType<typeof vi.fn>;
    reject: ReturnType<typeof vi.fn>;
  };
  let asideServiceMock: { isVisible: WritableSignal<boolean> };
  let onboardingServiceMock: { isTourActive: WritableSignal<boolean> };
  let toastShowServiceMock: { showError: ReturnType<typeof vi.fn> };
  let eventBusMock: { emit: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn>; onAny: ReturnType<typeof vi.fn> };
  let targetRequested$: Subject<{ target: string }>;

  const legacyCandidate: IGoalCandidate = {
    id: 'candidate-1',
    goalType: null,
    titleKey: null,
    rationaleKey: null,
    rationaleParams: null,
    title: 'Reduce overtime in the kitchen team',
    rationale: 'Overtime hours exceeded the target for three consecutive periods.',
    confidence: 'low',
    signalSource: 'target_hours_drift',
    status: 'proposed',
    createdUtc: '2026-07-24T06:00:00Z',
    decidedUtc: null,
  };

  const catalogueCandidate: IGoalCandidate = {
    ...legacyCandidate,
    id: 'candidate-2',
    goalType: 'target_hours_drift',
    titleKey: 'assistant-chat.goal-candidates.type.targetHoursDrift.title',
    rationaleKey: 'assistant-chat.goal-candidates.type.targetHoursDrift.rationale',
    rationaleParams: { count: '7', days: '7' },
  };

  beforeEach(async () => {
    const candidatesSignal = signal<IGoalCandidate[]>([]);
    goalCandidatesServiceMock = {
      candidates: candidatesSignal,
      hasCandidates: computed(() => candidatesSignal().length > 0),
      loadCandidates: vi.fn().mockReturnValue(of([])),
      approve: vi.fn().mockReturnValue(of(void 0)),
      reject: vi.fn().mockReturnValue(of(void 0)),
    };
    asideServiceMock = { isVisible: signal(true) };
    onboardingServiceMock = { isTourActive: signal(false) };
    toastShowServiceMock = { showError: vi.fn() };
    targetRequested$ = new Subject<{ target: string }>();
    eventBusMock = {
      emit: vi.fn(),
      on: vi.fn().mockReturnValue(targetRequested$.asObservable()),
      onAny: vi.fn().mockReturnValue(of()),
    };

    await TestBed.configureTestingModule({
      imports: [GoalCandidatesPanelComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementGoalCandidatesService, useValue: goalCandidatesServiceMock },
        { provide: AsideService, useValue: asideServiceMock },
        { provide: OnboardingService, useValue: onboardingServiceMock },
        { provide: ToastShowService, useValue: toastShowServiceMock },
        { provide: EVENT_BUS_TOKEN, useValue: eventBusMock },
      ],
    }).compileComponents();

    const translateService = TestBed.inject(TranslateService);
    vi.spyOn(translateService, 'instant').mockImplementation((key) => key as string);

    fixture = TestBed.createComponent(GoalCandidatesPanelComponent);
    component = fixture.componentInstance;
  });

  it('loads the proposed candidates once the aside is visible', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(goalCandidatesServiceMock.loadCandidates).toHaveBeenCalledTimes(1);
  });

  it('does not load while the setup tour is active', async () => {
    onboardingServiceMock.isTourActive.set(true);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(goalCandidatesServiceMock.loadCandidates).not.toHaveBeenCalled();
  });

  it('does not load while the aside is hidden', async () => {
    asideServiceMock.isVisible.set(false);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(goalCandidatesServiceMock.loadCandidates).not.toHaveBeenCalled();
  });

  it('shows a toast and keeps the panel usable when loading fails', async () => {
    goalCandidatesServiceMock.loadCandidates.mockReturnValue(throwError(() => new Error('offline')));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(toastShowServiceMock.showError).toHaveBeenCalledWith('assistant-chat.goal-candidates.load-error');
  });

  it('approve delegates to the management service and clears the pending state on success', () => {
    component.onApprove('candidate-1');

    expect(goalCandidatesServiceMock.approve).toHaveBeenCalledWith('candidate-1');
    expect(component.isPending('candidate-1')).toBe(false);
  });

  it('reject delegates to the management service and clears the pending state on success', () => {
    component.onReject('candidate-1');

    expect(goalCandidatesServiceMock.reject).toHaveBeenCalledWith('candidate-1');
    expect(component.isPending('candidate-1')).toBe(false);
  });

  it('shows a toast and clears the pending state when approve fails', () => {
    goalCandidatesServiceMock.approve.mockReturnValue(throwError(() => new Error('offline')));

    component.onApprove('candidate-1');

    expect(toastShowServiceMock.showError).toHaveBeenCalledWith('assistant-chat.goal-candidates.approve-error');
    expect(component.isPending('candidate-1')).toBe(false);
  });

  it('ignores a second decision while one is already in flight', () => {
    const neverCompletes = new Subject<void>();
    goalCandidatesServiceMock.approve.mockReturnValue(neverCompletes.asObservable());

    component.onApprove('candidate-1');
    component.onReject('candidate-1');

    expect(goalCandidatesServiceMock.reject).not.toHaveBeenCalled();
  });

  it('falls back to the stored text for a candidate without catalogue keys', async () => {
    goalCandidatesServiceMock.candidates.set([legacyCandidate]);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    expect(host.textContent).toContain(legacyCandidate.title);
    expect(host.textContent).toContain(legacyCandidate.rationale);
    expect(host.querySelector('.goal-candidate-approve')).toBeTruthy();
    expect(host.querySelector('.goal-candidate-reject')).toBeTruthy();
  });

  it('renders a catalogue candidate from its i18n keys instead of the stored English text', async () => {
    goalCandidatesServiceMock.candidates.set([catalogueCandidate]);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('.goal-candidate-title')?.textContent).toContain(catalogueCandidate.titleKey);
    expect(host.querySelector('.goal-candidate-rationale')?.textContent).toContain(catalogueCandidate.rationaleKey);
    expect(host.textContent).not.toContain(catalogueCandidate.title);
  });

  it('maps a committed confidence value to its translation key', () => {
    expect(component.confidenceLabelKey('low')).toBe('assistant-chat.goal-candidates.confidence.low');
    expect(component.hasConfidenceLabel('low')).toBe(true);
    expect(component.hasConfidenceLabel('high')).toBe(true);
  });

  it('shows no confidence line when the model committed to nothing', async () => {
    expect(component.hasConfidenceLabel('unknown')).toBe(false);
    expect(component.hasConfidenceLabel('bogus')).toBe(false);

    goalCandidatesServiceMock.candidates.set([{ ...catalogueCandidate, confidence: 'unknown' }]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.goal-candidate-confidence')).toBeNull();
  });

  it('passes the rationale parameters through and keeps the reference stable', () => {
    expect(component.rationaleParams(catalogueCandidate)).toEqual({ count: '7', days: '7' });
    expect(component.rationaleParams(legacyCandidate)).toBe(component.rationaleParams(legacyCandidate));
  });

  describe('collapse/expand', () => {
    beforeEach(async () => {
      goalCandidatesServiceMock.candidates.set([legacyCandidate]);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it('starts expanded and hides the list while keeping the header after toggling', () => {
      const host: HTMLElement = fixture.nativeElement;
      expect(component.isExpanded()).toBe(true);
      expect(host.querySelector('.goal-candidate-list')).toBeTruthy();

      component.toggleExpanded();
      fixture.detectChanges();

      expect(component.isExpanded()).toBe(false);
      expect(host.querySelector('.goal-candidates-header')).toBeTruthy();
      expect(host.querySelector('.goal-candidate-list')).toBeNull();
    });

    it('shows the list again after toggling twice', () => {
      component.toggleExpanded();
      component.toggleExpanded();
      fixture.detectChanges();

      expect(component.isExpanded()).toBe(true);
      expect(fixture.nativeElement.querySelector('.goal-candidate-list')).toBeTruthy();
    });

    it('re-expands automatically when Klacksy requests a target inside the panel', () => {
      component.toggleExpanded();
      fixture.detectChanges();
      expect(component.isExpanded()).toBe(false);

      targetRequested$.next({ target: 'goal-candidates-panel.approve' });
      fixture.detectChanges();

      expect(component.isExpanded()).toBe(true);
    });

    it('ignores target requests for unrelated panels', () => {
      component.toggleExpanded();
      fixture.detectChanges();

      targetRequested$.next({ target: 'some-other-panel.item' });
      fixture.detectChanges();

      expect(component.isExpanded()).toBe(false);
    });
  });
});
