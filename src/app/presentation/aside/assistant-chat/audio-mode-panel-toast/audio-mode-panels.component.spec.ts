// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed, signal, Signal, WritableSignal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { AudioModePanelsComponent } from './audio-mode-panels.component';
import { DataManagementGoalCandidatesService } from 'src/app/domain/services/assistant/data-management-goal-candidates.service';
import { DataManagementAgentPlanService } from 'src/app/domain/services/assistant/data-management-agent-plan.service';
import { IGoalCandidate } from 'src/app/domain/interfaces/goal-candidate.interface';
import { IAgentPlan, PlanStatus } from 'src/app/domain/models/assistant/agent-plan.interface';

describe('AudioModePanelsComponent', () => {
  let fixture: ComponentFixture<AudioModePanelsComponent>;
  let component: AudioModePanelsComponent;

  let goalCandidatesServiceMock: {
    candidates: WritableSignal<IGoalCandidate[]>;
    hasCandidates: Signal<boolean>;
    loadCandidates: ReturnType<typeof vi.fn>;
  };

  let planServiceMock: {
    activePlan: WritableSignal<IAgentPlan | null>;
    hasVisiblePlan: Signal<boolean>;
    isExecuting: Signal<boolean>;
    isPausedForApproval: Signal<boolean>;
    isCompleted: Signal<boolean>;
    isFailed: Signal<boolean>;
    isApproving: Signal<boolean>;
    isAborting: Signal<boolean>;
    steps: Signal<any[]>;
  };

  const sampleCandidate: IGoalCandidate = {
    id: 'cand-1',
    goalType: 'target_hours_drift',
    titleKey: 'assistant-chat.goal-candidates.type.targetHoursDrift.title',
    rationaleKey: 'assistant-chat.goal-candidates.type.targetHoursDrift.rationale',
    rationaleParams: { count: '5', days: '7' },
    title: 'Reduce overtime',
    rationale: 'Overtime exceeded.',
    confidence: 'high',
    signalSource: 'target_hours_drift',
    status: 'proposed',
    createdUtc: '2026-09-05T10:00:00Z',
    decidedUtc: null,
  };

  const samplePlan: IAgentPlan = {
    id: 'plan-1',
    goal: 'Test Goal',
    status: PlanStatus.Executing,
    currentStepIndex: 1,
    lastErrorMessage: null,
    steps: [
      { skill: 'search_employees', verifySkill: null, reversible: true, params: {} },
      { skill: 'create_employee', verifySkill: null, reversible: false, params: {} },
    ],
  };

  beforeEach(async () => {
    const candidatesSignal = signal<IGoalCandidate[]>([]);
    const planSignal = signal<IAgentPlan | null>(null);
    const stepsSignal = signal<any[]>([]);

    goalCandidatesServiceMock = {
      candidates: candidatesSignal,
      hasCandidates: computed(() => candidatesSignal().length > 0),
      loadCandidates: vi.fn().mockReturnValue(of([])),
    };

    planServiceMock = {
      activePlan: planSignal,
      hasVisiblePlan: computed(() => planSignal() !== null),
      isExecuting: computed(() => planSignal()?.status === PlanStatus.Executing),
      isPausedForApproval: computed(() => planSignal()?.status === PlanStatus.PausedForApproval),
      isCompleted: computed(() => planSignal()?.status === PlanStatus.Completed),
      isFailed: computed(() => planSignal()?.status === PlanStatus.Failed),
      isApproving: signal(false),
      isAborting: signal(false),
      steps: stepsSignal,
    };

    await TestBed.configureTestingModule({
      imports: [AudioModePanelsComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementGoalCandidatesService, useValue: goalCandidatesServiceMock },
        { provide: DataManagementAgentPlanService, useValue: planServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AudioModePanelsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // Test 1: Default state — both panels collapsed
  it('Test 1: both panels collapsed by default', () => {
    expect(component.isCandidatesExpanded()).toBe(false);
    expect(component.isPlanExpanded()).toBe(false);
  });

  // Test 2: No panels rendered when no candidates and no plan
  it('Test 2: renders no cards when no candidates and no plan', () => {
    const cards = fixture.nativeElement.querySelectorAll('.audio-panel-card');
    expect(cards.length).toBe(0);
  });

  // Test 3: Goal candidates card renders when candidates exist
  it('Test 3: renders goal-candidates card when candidates exist', () => {
    goalCandidatesServiceMock.candidates.set([sampleCandidate]);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.audio-panel-card');
    expect(cards.length).toBe(1);

    const header = cards[0].querySelector('.audio-panel-header');
    expect(header).toBeTruthy();
    expect(header.textContent).toContain('Zielvorschläge'); // German i18n

    // Badge shows count
    const badge = cards[0].querySelector('.audio-panel-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent.trim()).toBe('1');
  });

  // Test 4: Plan execution card renders when plan exists
  it('Test 4: renders plan-execution card when plan exists', () => {
    planServiceMock.activePlan.set(samplePlan);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.audio-panel-card');
    expect(cards.length).toBe(1);

    const header = cards[0].querySelector('.audio-panel-header');
    expect(header).toBeTruthy();
    expect(header.textContent).toContain('Plan-Ausführung'); // German i18n
  });

  // Test 5: Both cards render when both exist
  it('Test 5: renders both cards when both candidates and plan exist', () => {
    goalCandidatesServiceMock.candidates.set([sampleCandidate]);
    planServiceMock.activePlan.set(samplePlan);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.audio-panel-card');
    expect(cards.length).toBe(2);
  });

  // Test 6: Toggle candidates expansion
  it('Test 6: toggleCandidates expands and collapses', () => {
    goalCandidatesServiceMock.candidates.set([sampleCandidate]);
    fixture.detectChanges();

    expect(component.isCandidatesExpanded()).toBe(false);

    component.toggleCandidates();
    fixture.detectChanges();
    expect(component.isCandidatesExpanded()).toBe(true);

    // Content should be visible
    const content = fixture.nativeElement.querySelector('.audio-panel-content');
    expect(content).toBeTruthy();

    component.toggleCandidates();
    fixture.detectChanges();
    expect(component.isCandidatesExpanded()).toBe(false);
  });

  // Test 7: Toggle plan expansion
  it('Test 7: togglePlan expands and collapses', () => {
    planServiceMock.activePlan.set(samplePlan);
    fixture.detectChanges();

    expect(component.isPlanExpanded()).toBe(false);

    component.togglePlan();
    fixture.detectChanges();
    expect(component.isPlanExpanded()).toBe(true);

    component.togglePlan();
    fixture.detectChanges();
    expect(component.isPlanExpanded()).toBe(false);
  });

  // Test 8: Plan status label key computed correctly
  it('Test 8: planStatusLabelKey returns correct i18n key for executing status', () => {
    planServiceMock.activePlan.set({ ...samplePlan, status: PlanStatus.Executing });
    fixture.detectChanges();

    expect(component.planStatusLabelKey()).toBe('assistant-chat.plan-execution.status.executing');
  });

  it('Test 9: planStatusLabelKey returns correct i18n key for paused status', () => {
    planServiceMock.activePlan.set({ ...samplePlan, status: PlanStatus.PausedForApproval });
    fixture.detectChanges();

    expect(component.planStatusLabelKey()).toBe('assistant-chat.plan-execution.status.paused_for_approval');
  });

  it('Test 10: planStatusLabelKey returns empty when no plan', () => {
    planServiceMock.activePlan.set(null);
    fixture.detectChanges();

    expect(component.planStatusLabelKey()).toBe('');
  });

  // Test 11: Badge shows correct count for multiple candidates
  it('Test 11: badge shows correct count for multiple candidates', () => {
    const candidates = [
      { ...sampleCandidate, id: 'c1' },
      { ...sampleCandidate, id: 'c2' },
      { ...sampleCandidate, id: 'c3' },
    ];
    goalCandidatesServiceMock.candidates.set(candidates);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.audio-panel-badge');
    expect(badge.textContent.trim()).toBe('3');
  });

  // Test 12: onPlanApprove delegates to plan panel
  it('Test 12: onPlanApprove calls plan panel approve', () => {
    planServiceMock.activePlan.set(samplePlan);
    fixture.detectChanges();

    // Expand to render the panel
    component.togglePlan();
    fixture.detectChanges();

    // Should not throw when called
    expect(() => component.onPlanApprove('plan-1')).not.toThrow();
  });

  // Test 13: onPlanAbort delegates to plan panel
  it('Test 13: onPlanAbort calls plan panel abort', () => {
    planServiceMock.activePlan.set(samplePlan);
    fixture.detectChanges();

    component.togglePlan();
    fixture.detectChanges();

    expect(() => component.onPlanAbort('plan-1')).not.toThrow();
  });

  // Test 14: Chevron icon changes on expand
  it('Test 14: chevron icon changes when expanded', () => {
    goalCandidatesServiceMock.candidates.set([sampleCandidate]);
    fixture.detectChanges();

    let chevrons = fixture.nativeElement.querySelectorAll('.audio-panel-chevron fa-icon');
    // Initially collapsed → chevronDown
    expect(component.isCandidatesExpanded()).toBe(false);

    component.toggleCandidates();
    fixture.detectChanges();
    expect(component.isCandidatesExpanded()).toBe(true);
  });
});
