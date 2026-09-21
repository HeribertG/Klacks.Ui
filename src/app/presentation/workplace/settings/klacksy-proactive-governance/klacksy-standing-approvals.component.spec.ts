// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { KlacksyStandingApprovalsComponent } from './klacksy-standing-approvals.component';
import { StandingApprovalService } from 'src/app/domain/services/assistant/standing-approval.service';
import { ProactiveGovernanceService } from 'src/app/domain/services/assistant/proactive-governance.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { IStandingApproval } from 'src/app/domain/models/assistant/standing-approval.interface';
import { STANDING_APPROVAL_LIMITS, STANDING_APPROVAL_STATUS } from 'src/app/domain/constants/standing-approval.constants';
import { signal } from '@angular/core';

const GROUP_ID = '11111111-1111-1111-1111-111111111111';

const approval = (overrides: Partial<IStandingApproval> = {}): IStandingApproval => ({
  id: 'a1',
  triggerKind: 'unstaffed_shift',
  groupId: null,
  grantedByUserId: '22222222-2222-2222-2222-222222222222',
  grantedAtUtc: '2026-09-01T10:00:00Z',
  expiresAtUtc: '2026-10-01T10:00:00Z',
  dailyBudget: 20,
  revokedAtUtc: null,
  revokedByUserId: null,
  isActive: true,
  ...overrides,
});

describe('KlacksyStandingApprovalsComponent', () => {
  let service: {
    getAll: ReturnType<typeof vi.fn>;
    grant: ReturnType<typeof vi.fn>;
    revoke: ReturnType<typeof vi.fn>;
    getGroupOptions: ReturnType<typeof vi.fn>;
  };
  let toast: { showError: ReturnType<typeof vi.fn>; showSuccess: ReturnType<typeof vi.fn> };
  let modal: { openModal: ReturnType<typeof vi.fn> };

  const rules = [
    { triggerKind: 'unstaffed_shift', isScenarioCapable: true },
    { triggerKind: 'unstaffed_shift', isScenarioCapable: true },
    { triggerKind: 'report_only_kind', isScenarioCapable: false },
  ];

  const create = (isAdmin: boolean) => {
    TestBed.configureTestingModule({
      imports: [KlacksyStandingApprovalsComponent, TranslateModule.forRoot()],
      providers: [
        { provide: StandingApprovalService, useValue: service },
        { provide: ProactiveGovernanceService, useValue: { governance: signal({ rules }) } },
        { provide: AuthorizationService, useValue: { isAdmin } },
        { provide: ModalService, useValue: modal },
        { provide: ToastShowService, useValue: toast },
      ],
    });
    const fixture = TestBed.createComponent(KlacksyStandingApprovalsComponent);
    return { fixture, component: fixture.componentInstance };
  };

  beforeEach(() => {
    service = {
      getAll: vi.fn().mockReturnValue(of([approval()])),
      grant: vi.fn().mockReturnValue(of(approval())),
      revoke: vi.fn().mockReturnValue(of(undefined)),
      getGroupOptions: vi.fn().mockReturnValue(of([{ id: GROUP_ID, name: 'Night' }])),
    };
    toast = { showError: vi.fn(), showSuccess: vi.fn() };
    modal = { openModal: vi.fn() };
  });

  it('loads approvals and groups for an admin', async () => {
    const { component } = create(true);
    await component.ngOnInit();
    expect(component.approvals().length).toBe(1);
    expect(component.groups().length).toBe(1);
  });

  it('loads nothing and shows nothing for a non-admin', async () => {
    const { fixture, component } = create(false);
    await component.ngOnInit();
    fixture.detectChanges();
    expect(service.getAll).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#standing-approval-grant')).toBeNull();
    expect(component.canGrant()).toBe(false);
    expect(component.canRevoke(approval())).toBe(false);
  });

  it('offers only scenario capable kinds, once each', () => {
    const { component } = create(true);
    expect(component.eligibleKinds()).toEqual(['unstaffed_shift']);
  });

  it('derives the status from revoked and active', () => {
    const { component } = create(true);
    expect(component.statusOf(approval())).toBe(STANDING_APPROVAL_STATUS.Active);
    expect(component.statusOf(approval({ isActive: false }))).toBe(STANDING_APPROVAL_STATUS.Expired);
    expect(
      component.statusOf(approval({ isActive: false, revokedAtUtc: '2026-09-05T10:00:00Z' }))
    ).toBe(STANDING_APPROVAL_STATUS.Revoked);
  });

  it('labels a missing group as null and an unknown group by its id', async () => {
    const { component } = create(true);
    await component.ngOnInit();
    expect(component.groupLabelOf(null)).toBeNull();
    expect(component.groupLabelOf(GROUP_ID)).toBe('Night');
    expect(component.groupLabelOf('other')).toBe('other');
  });

  it('blocks grant without a kind or with values outside the limits', () => {
    const { component } = create(true);
    expect(component.canGrant()).toBe(false);
    component.onSelectKind('unstaffed_shift');
    expect(component.canGrant()).toBe(true);
    component.onChangeDays(String(STANDING_APPROVAL_LIMITS.MaximumDurationDays + 1));
    expect(component.canGrant()).toBe(false);
    component.onChangeDays(String(STANDING_APPROVAL_LIMITS.MinimumDurationDays));
    component.onChangeBudget('0');
    expect(component.canGrant()).toBe(false);
  });

  it('grants with the form values, reloads and resets the form', async () => {
    const { component } = create(true);
    component.onSelectKind('unstaffed_shift');
    component.onSelectGroup(GROUP_ID);
    component.onChangeDays('10');
    component.onChangeBudget('5');
    await component.onGrant();
    expect(service.grant).toHaveBeenCalledWith({
      triggerKind: 'unstaffed_shift',
      groupId: GROUP_ID,
      durationDays: 10,
      dailyBudget: 5,
    });
    expect(service.getAll).toHaveBeenCalled();
    expect(toast.showSuccess).toHaveBeenCalled();
    expect(component.draftKind()).toBe('');
    expect(component.draftDays()).toBe(STANDING_APPROVAL_LIMITS.DefaultDurationDays);
  });

  it('sends null for the whole installation', async () => {
    const { component } = create(true);
    component.onSelectKind('unstaffed_shift');
    await component.onGrant();
    expect(service.grant.mock.calls[0][0].groupId).toBeNull();
  });

  it('shows the server text of a 409 conflict with a toast name', async () => {
    service.grant.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: 'Already active for this kind.' }))
    );
    const { component } = create(true);
    component.onSelectKind('unstaffed_shift');
    await component.onGrant();
    expect(toast.showError).toHaveBeenCalledWith('Already active for this kind.', expect.any(String));
    expect(component.isBusy()).toBe(false);
  });

  it('falls back to a translated conflict message when the body is empty', async () => {
    service.grant.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const { component } = create(true);
    component.onSelectKind('unstaffed_shift');
    await component.onGrant();
    expect(toast.showError).toHaveBeenCalledWith(
      'setting.standingApprovals.grant-conflict',
      expect.any(String)
    );
  });

  it('reads a problem-details body of a refusal', async () => {
    service.grant.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'Duration too long.' } }))
    );
    const { component } = create(true);
    component.onSelectKind('unstaffed_shift');
    await component.onGrant();
    expect(toast.showError).toHaveBeenCalledWith('Duration too long.', expect.any(String));
  });

  it('asks for confirmation before revoking and revokes on confirm', async () => {
    const { component } = create(true);
    component.onRevoke(approval());
    expect(modal.openModal).toHaveBeenCalledTimes(1);
    const options = modal.openModal.mock.calls[0][0];
    expect(options.type).toBe(ModalType.Confirmation);
    expect(service.revoke).not.toHaveBeenCalled();
    options.onConfirm();
    await vi.waitFor(() => expect(service.revoke).toHaveBeenCalledWith('a1'));
  });

  it('does not offer revoke for an expired approval', () => {
    const { component } = create(true);
    component.onRevoke(approval({ isActive: false }));
    expect(modal.openModal).not.toHaveBeenCalled();
  });

  it('reports a failed revoke', async () => {
    service.revoke.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const { component } = create(true);
    component.onRevoke(approval());
    modal.openModal.mock.calls[0][0].onConfirm();
    await vi.waitFor(() => expect(toast.showError).toHaveBeenCalled());
  });
});
