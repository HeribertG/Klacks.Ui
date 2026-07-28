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

  const candidateOne: IGoalCandidate = {
    id: 'candidate-1',
    title: 'Reduce overtime in the kitchen team',
    rationale: 'Overtime hours exceeded the target for three consecutive periods.',
    confidence: 'Low',
    signalSource: 'target-hours-drift',
    status: 'proposed',
    createdUtc: '2026-07-24T06:00:00Z',
    decidedUtc: null,
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

    await TestBed.configureTestingModule({
      imports: [GoalCandidatesPanelComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementGoalCandidatesService, useValue: goalCandidatesServiceMock },
        { provide: AsideService, useValue: asideServiceMock },
        { provide: OnboardingService, useValue: onboardingServiceMock },
        { provide: ToastShowService, useValue: toastShowServiceMock },
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

  it('renders the full title, rationale and both action buttons for a proposed candidate', async () => {
    goalCandidatesServiceMock.candidates.set([candidateOne]);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    expect(host.textContent).toContain(candidateOne.title);
    expect(host.textContent).toContain(candidateOne.rationale);
    expect(host.querySelector('.goal-candidate-approve')).toBeTruthy();
    expect(host.querySelector('.goal-candidate-reject')).toBeTruthy();
  });

  it('maps a known confidence value to its translation key', () => {
    expect(component.confidenceLabelKey('Low')).toBe('assistant-chat.goal-candidates.confidence.low');
  });

  it('falls back to unknown for an unrecognized confidence value', () => {
    expect(component.confidenceLabelKey('Bogus')).toBe('assistant-chat.goal-candidates.confidence.unknown');
  });
});
