// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { KlacksyProactiveGovernanceComponent } from './klacksy-proactive-governance.component';
import { DataProactiveGovernanceService } from 'src/app/infrastructure/api/assistant/data-proactive-governance.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { StandingApprovalService } from 'src/app/domain/services/assistant/standing-approval.service';
import { IProactiveGovernance } from 'src/app/domain/models/assistant/proactive-governance.interface';
import { IProactiveGovernanceRule } from 'src/app/domain/models/assistant/proactive-governance-rule.interface';

describe('KlacksyProactiveGovernanceComponent', () => {
  let component: KlacksyProactiveGovernanceComponent;
  let fixture: ComponentFixture<KlacksyProactiveGovernanceComponent>;
  let mockDataGovernanceService: {
    get: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let mockToast: { showError: ReturnType<typeof vi.fn> };

  const rule = (overrides: Partial<IProactiveGovernanceRule> = {}): IProactiveGovernanceRule => ({
    triggerKind: 'unstaffed_shift',
    groupId: null,
    maxAction: 0,
    maxActionName: 'Hint',
    effectiveMaxAction: 0,
    globalAutonomyCap: 3,
    enabled: true,
    dailyActionBudget: 5,
    windowActionLimit: 3,
    windowMinutes: 60,
    isStored: true,
    isScenarioCapable: true,
    ...overrides,
  });

  const governance = (overrides: Partial<IProactiveGovernance> = {}): IProactiveGovernance => ({
    globalAutonomyLevel: 2,
    globalAutonomyCap: 2,
    killSwitchActive: false,
    rules: [rule()],
    ...overrides,
  });

  beforeEach(async () => {
    mockDataGovernanceService = {
      get: vi.fn().mockReturnValue(of(governance())),
      update: vi.fn().mockReturnValue(of(governance({ killSwitchActive: true }))),
    };
    mockToast = { showError: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [KlacksyProactiveGovernanceComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataProactiveGovernanceService, useValue: mockDataGovernanceService },
        { provide: ToastShowService, useValue: mockToast },
        { provide: AuthorizationService, useValue: { isAdmin: false } },
        { provide: StandingApprovalService, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(KlacksyProactiveGovernanceComponent);
    component = fixture.componentInstance;
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('loads the governance rules on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockDataGovernanceService.get).toHaveBeenCalled();
    expect(component.rules().length).toBe(1);
    expect(component.isLoading()).toBe(false);
  });

  it('offers exactly the three ladder steps', () => {
    expect(component.maxActions.map((step) => step.value)).toEqual([0, 1, 2]);
  });

  it('disables the prepare step for a finding type that cannot prepare a scenario', () => {
    expect(component.isStepDisabled(rule({ isScenarioCapable: false }), 1)).toBe(true);
    expect(component.isStepDisabled(rule({ isScenarioCapable: false }), 0)).toBe(false);
    expect(component.isStepDisabled(rule({ isScenarioCapable: false }), 2)).toBe(false);
  });

  it('keeps the prepare step selectable when the type is capable or already set to it', () => {
    expect(component.isStepDisabled(rule({ isScenarioCapable: true }), 1)).toBe(false);
    expect(component.isStepDisabled(rule({ isScenarioCapable: false, maxAction: 1 }), 1)).toBe(false);
  });

  it('persists the kill switch immediately and adopts the answer', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component.onToggleKillSwitch(true);

    expect(mockDataGovernanceService.update).toHaveBeenCalledWith({ killSwitch: true });
    expect(component.killSwitchActive()).toBe(true);
  });

  it('renders the four global level buttons', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll(
      '.level-list .level-option'
    );
    expect(buttons.length).toBe(4);
  });

  it('persists a clicked global level immediately', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component.onSelectLevel(3);

    expect(mockDataGovernanceService.update).toHaveBeenCalledWith({ autonomyLevel: 3 });
  });

  it('marks a rule capped by the global level instead of pinned to hint', async () => {
    mockDataGovernanceService.get.mockReturnValue(
      of(
        governance({
          rules: [
            rule({ maxAction: 2, maxActionName: 'Execute', effectiveMaxAction: 1, globalAutonomyCap: 1 }),
          ],
        })
      )
    );

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const badge: HTMLElement = fixture.nativeElement.querySelector('.pinned-badge');
    expect(badge.textContent).toContain('setting.proactiveGovernance.capped-by-global-level');
  });

  it('persists a changed ladder step for one finding type', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component.onChangeMaxAction(rule(), '1');

    expect(mockDataGovernanceService.update).toHaveBeenCalledWith({
      triggerKind: 'unstaffed_shift',
      maxAction: 1,
    });
  });

  it('skips the call when the ladder step did not change', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component.onChangeMaxAction(rule({ maxAction: 1 }), '1');

    expect(mockDataGovernanceService.update).not.toHaveBeenCalled();
  });

  it('reloads the stored truth when a rejected change comes back', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    mockDataGovernanceService.update.mockReturnValue(throwError(() => new Error('rejected')));

    await component.onChangeMaxAction(rule(), '1');

    expect(mockToast.showError).toHaveBeenCalled();
    expect(mockDataGovernanceService.get).toHaveBeenCalledTimes(2);
    expect(component.rules()[0].maxAction).toBe(0);
  });

  it('preselects the stored ladder step in the dropdown', async () => {
    mockDataGovernanceService.get.mockReturnValue(
      of(governance({ rules: [rule({ maxAction: 1, maxActionName: 'Prepare', effectiveMaxAction: 1 })] }))
    );

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const select: HTMLSelectElement = fixture.nativeElement.querySelector(
      '#proactive-governance-max-action-unstaffed_shift'
    );
    expect(select.value).toBe('1');
  });

  it('skips a numeric change that did not move', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component.onChangeDailyActionBudget(rule(), '5');

    expect(mockDataGovernanceService.update).not.toHaveBeenCalled();
  });

  it('persists a changed daily budget', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component.onChangeDailyActionBudget(rule(), '9');

    expect(mockDataGovernanceService.update).toHaveBeenCalledWith({
      triggerKind: 'unstaffed_shift',
      dailyActionBudget: 9,
    });
  });
});
