// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { KlacksyProactiveGovernanceComponent } from './klacksy-proactive-governance.component';
import { ProactiveGovernanceService } from 'src/app/domain/services/assistant/proactive-governance.service';
import { UserAdministrationManagementService } from 'src/app/domain/services/settings/user-administration-management.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { IProactiveGovernance } from 'src/app/domain/models/assistant/proactive-governance.interface';
import { IProactiveGovernanceRule } from 'src/app/domain/models/assistant/proactive-governance-rule.interface';

describe('KlacksyProactiveGovernanceComponent', () => {
  let component: KlacksyProactiveGovernanceComponent;
  let fixture: ComponentFixture<KlacksyProactiveGovernanceComponent>;
  let mockGovernanceService: {
    get: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let mockUserAdmin: { accountsList: ReturnType<typeof signal>; loadAccounts: ReturnType<typeof vi.fn> };
  let mockToast: { showError: ReturnType<typeof vi.fn> };

  const rule = (overrides: Partial<IProactiveGovernanceRule> = {}): IProactiveGovernanceRule => ({
    triggerKind: 'unstaffed_shift',
    groupId: null,
    maxAction: 0,
    maxActionName: 'Hint',
    effectiveMaxAction: 0,
    enabled: true,
    responsibleOwnerUserId: null,
    dailyActionBudget: 5,
    windowActionLimit: 3,
    windowMinutes: 60,
    isStored: true,
    ...overrides,
  });

  const governance = (overrides: Partial<IProactiveGovernance> = {}): IProactiveGovernance => ({
    killSwitchActive: false,
    rules: [rule()],
    ...overrides,
  });

  beforeEach(async () => {
    mockGovernanceService = {
      get: vi.fn().mockReturnValue(of(governance())),
      update: vi.fn().mockReturnValue(of(governance({ killSwitchActive: true }))),
    };
    mockUserAdmin = { accountsList: signal([]), loadAccounts: vi.fn() };
    mockToast = { showError: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [KlacksyProactiveGovernanceComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ProactiveGovernanceService, useValue: mockGovernanceService },
        { provide: UserAdministrationManagementService, useValue: mockUserAdmin },
        { provide: ToastShowService, useValue: mockToast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(KlacksyProactiveGovernanceComponent);
    component = fixture.componentInstance;
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('loads the governance rules and the account list on init', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockGovernanceService.get).toHaveBeenCalled();
    expect(mockUserAdmin.loadAccounts).toHaveBeenCalled();
    expect(component.rules().length).toBe(1);
    expect(component.isLoading()).toBe(false);
  });

  it('offers exactly the three ladder steps', () => {
    expect(component.maxActions.map((step) => step.value)).toEqual([0, 1, 2]);
  });

  it('persists the kill switch immediately and adopts the answer', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component.onToggleKillSwitch(true);

    expect(mockGovernanceService.update).toHaveBeenCalledWith({ killSwitch: true });
    expect(component.killSwitchActive()).toBe(true);
  });

  it('persists a changed ladder step for one finding type', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component.onChangeMaxAction(rule(), '1');

    expect(mockGovernanceService.update).toHaveBeenCalledWith({
      triggerKind: 'unstaffed_shift',
      maxAction: 1,
    });
  });

  it('skips the call when the ladder step did not change', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component.onChangeMaxAction(rule({ maxAction: 1 }), '1');

    expect(mockGovernanceService.update).not.toHaveBeenCalled();
  });

  it('sends an explicit clear flag when the accountable person is removed', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component.onChangeResponsibleOwner(rule({ responsibleOwnerUserId: 'someone' }), '');

    expect(mockGovernanceService.update).toHaveBeenCalledWith({
      triggerKind: 'unstaffed_shift',
      clearResponsibleOwner: true,
    });
  });

  it('sends the selected account as the accountable person', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component.onChangeResponsibleOwner(rule(), 'user-1');

    expect(mockGovernanceService.update).toHaveBeenCalledWith({
      triggerKind: 'unstaffed_shift',
      responsibleOwnerUserId: 'user-1',
    });
  });

  it('reloads the stored truth when a rejected change comes back', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    mockGovernanceService.update.mockReturnValue(throwError(() => new Error('rejected')));

    await component.onChangeMaxAction(rule(), '1');

    expect(mockToast.showError).toHaveBeenCalled();
    expect(mockGovernanceService.get).toHaveBeenCalledTimes(2);
    expect(component.rules()[0].maxAction).toBe(0);
  });

  it('preselects the stored ladder step in the dropdown', async () => {
    mockGovernanceService.get.mockReturnValue(
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

  it('preselects the stored accountable person in the dropdown', async () => {
    mockUserAdmin.accountsList.set([{ id: 'user-1', firstName: 'Ada', lastName: 'Lovelace' }]);
    mockGovernanceService.get.mockReturnValue(
      of(governance({ rules: [rule({ responsibleOwnerUserId: 'user-1' })] }))
    );

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const select: HTMLSelectElement = fixture.nativeElement.querySelector(
      '#proactive-governance-owner-unstaffed_shift'
    );
    expect(select.value).toBe('user-1');
  });

  it('skips a numeric change that did not move', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component.onChangeDailyActionBudget(rule(), '5');

    expect(mockGovernanceService.update).not.toHaveBeenCalled();
  });

  it('persists a changed daily budget', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component.onChangeDailyActionBudget(rule(), '9');

    expect(mockGovernanceService.update).toHaveBeenCalledWith({
      triggerKind: 'unstaffed_shift',
      dailyActionBudget: 9,
    });
  });
});
