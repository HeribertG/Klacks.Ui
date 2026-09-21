// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Admin-only section of the governance card for standing approvals: lists the advance approvals, grants
 * a new one for a finding type and group, and revokes a running one after a confirmation. Only finding
 * types that can prepare a remediation are offered, because the server refuses every other kind.
 * @param approvals - Signal holding the approvals the server last returned
 * @param groups - Signal with the selectable groups, loaded once
 * @param isBusy - Signal set while a grant or revoke request is running
 * @param draftKind - Finding type chosen in the grant form
 * @param draftGroupId - Group chosen in the grant form; empty means the whole installation
 * @param draftDays - Duration in days typed into the grant form
 * @param draftBudget - Daily budget typed into the grant form
 */

import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { LocaleService } from 'src/app/application/services/locale.service';
import { StandingApprovalService } from 'src/app/domain/services/assistant/standing-approval.service';
import { IStandingApprovalGroupOption } from 'src/app/domain/models/assistant/standing-approval-group-option.interface';
import { ProactiveGovernanceService } from 'src/app/domain/services/assistant/proactive-governance.service';
import { IStandingApproval } from 'src/app/domain/models/assistant/standing-approval.interface';
import {
  STANDING_APPROVAL_HTTP_CONFLICT,
  STANDING_APPROVAL_LIMITS,
  STANDING_APPROVAL_SHORT_ID_LENGTH,
  STANDING_APPROVAL_STATUS,
  StandingApprovalStatus,
} from 'src/app/domain/constants/standing-approval.constants';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { companyTimeZone } from 'src/app/shared/helpers/calendar-date.helper';

const TRANSLATION_PREFIX = 'setting.standingApprovals.';
const TOAST_NAME_LOAD = 'standing-approvals-load';
const TOAST_NAME_GRANT = 'standing-approvals-grant';
const TOAST_NAME_REVOKE = 'standing-approvals-revoke';

@Component({
  selector: 'app-klacksy-standing-approvals',
  templateUrl: './klacksy-standing-approvals.component.html',
  styleUrls: ['./klacksy-standing-approvals.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KlacksyStandingApprovalsComponent implements OnInit {
  private authorizationService = inject(AuthorizationService);
  private standingApprovalService = inject(StandingApprovalService);
  private proactiveGovernanceService = inject(ProactiveGovernanceService);
  private modalService = inject(ModalService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);
  private localeService = inject(LocaleService);

  readonly limits = STANDING_APPROVAL_LIMITS;
  readonly isAdmin = this.authorizationService.isAdmin;
  readonly approvals = signal<IStandingApproval[]>([]);
  readonly groups = signal<IStandingApprovalGroupOption[]>([]);
  readonly isBusy = signal(false);
  readonly draftKind = signal('');
  readonly draftGroupId = signal('');
  readonly draftDays = signal<number>(STANDING_APPROVAL_LIMITS.DefaultDurationDays);
  readonly draftBudget = signal<number>(STANDING_APPROVAL_LIMITS.DefaultDailyBudget);

  readonly eligibleKinds = computed(() => {
    const rules = this.proactiveGovernanceService.governance()?.rules ?? [];
    return [...new Set(rules.filter((rule) => rule.isScenarioCapable).map((rule) => rule.triggerKind))];
  });

  readonly isDraftValid = computed(
    () =>
      this.draftKind() !== '' &&
      this.isIntegerInRange(
        this.draftDays(),
        STANDING_APPROVAL_LIMITS.MinimumDurationDays,
        STANDING_APPROVAL_LIMITS.MaximumDurationDays
      ) &&
      this.isIntegerInRange(
        this.draftBudget(),
        STANDING_APPROVAL_LIMITS.MinimumDailyBudget,
        STANDING_APPROVAL_LIMITS.MaximumDailyBudget
      )
  );

  readonly canGrant = computed(() => this.isAdmin && this.isDraftValid() && !this.isBusy());

  async ngOnInit(): Promise<void> {
    if (!this.isAdmin) {
      return;
    }

    await Promise.all([this.loadApprovals(), this.loadGroups()]);
  }

  statusOf(approval: IStandingApproval): StandingApprovalStatus {
    if (approval.revokedAtUtc) {
      return STANDING_APPROVAL_STATUS.Revoked;
    }

    return approval.isActive ? STANDING_APPROVAL_STATUS.Active : STANDING_APPROVAL_STATUS.Expired;
  }

  canRevoke(approval: IStandingApproval): boolean {
    return this.isAdmin && this.statusOf(approval) === STANDING_APPROVAL_STATUS.Active;
  }

  statusKeyOf(approval: IStandingApproval): string {
    return `${TRANSLATION_PREFIX}status.${this.statusOf(approval)}`;
  }

  kindKeyOf(triggerKind: string): string {
    return `setting.proactiveGovernance.kind.${triggerKind}`;
  }

  groupLabelOf(groupId: string | null): string | null {
    if (!groupId) {
      return null;
    }

    return this.groups().find((group) => group.id === groupId)?.name ?? groupId;
  }

  shortId(id: string): string {
    return id.slice(0, STANDING_APPROVAL_SHORT_ID_LENGTH);
  }

  formatExpiry(expiresAtUtc: string): string {
    const instant = new Date(expiresAtUtc);
    if (isNaN(instant.getTime())) {
      return expiresAtUtc;
    }

    const timeZone = companyTimeZone();
    return new Intl.DateTimeFormat(this.localeService.getLocale(), {
      calendar: 'gregory',
      numberingSystem: 'latn',
      dateStyle: 'medium',
      ...(timeZone ? { timeZone } : {}),
    }).format(instant);
  }

  onSelectKind(value: string): void {
    this.draftKind.set(value);
  }

  onSelectGroup(value: string): void {
    this.draftGroupId.set(value);
  }

  onChangeDays(rawValue: string): void {
    this.draftDays.set(Number(rawValue));
  }

  onChangeBudget(rawValue: string): void {
    this.draftBudget.set(Number(rawValue));
  }

  async onGrant(): Promise<void> {
    if (!this.canGrant()) {
      return;
    }

    this.isBusy.set(true);
    try {
      await firstValueFrom(
        this.standingApprovalService.grant({
          triggerKind: this.draftKind(),
          groupId: this.draftGroupId() || null,
          durationDays: this.draftDays(),
          dailyBudget: this.draftBudget(),
        })
      );
      this.draftKind.set('');
      this.draftGroupId.set('');
      this.draftDays.set(STANDING_APPROVAL_LIMITS.DefaultDurationDays);
      this.draftBudget.set(STANDING_APPROVAL_LIMITS.DefaultDailyBudget);
      this.toastShowService.showSuccess(
        this.translateService.instant(`${TRANSLATION_PREFIX}granted`),
        this.translateService.instant(`${TRANSLATION_PREFIX}headline`)
      );
      await this.loadApprovals();
    } catch (error) {
      this.showError(this.grantErrorMessage(error), TOAST_NAME_GRANT);
    } finally {
      this.isBusy.set(false);
    }
  }

  onRevoke(approval: IStandingApproval): void {
    if (!this.canRevoke(approval) || this.isBusy()) {
      return;
    }

    this.modalService.openModal({
      type: ModalType.Confirmation,
      title: this.translateService.instant(`${TRANSLATION_PREFIX}revoke-title`),
      message: this.translateService.instant(`${TRANSLATION_PREFIX}revoke-body`, {
        kind: this.translateService.instant(this.kindKeyOf(approval.triggerKind)),
      }),
      confirmText: this.translateService.instant(`${TRANSLATION_PREFIX}revoke`),
      cancelText: this.translateService.instant(`${TRANSLATION_PREFIX}cancel`),
      onConfirm: () => {
        void this.revoke(approval);
      },
    });
  }

  private async revoke(approval: IStandingApproval): Promise<void> {
    this.isBusy.set(true);
    try {
      await firstValueFrom(this.standingApprovalService.revoke(approval.id));
      await this.loadApprovals();
    } catch (error) {
      this.showError(this.errorBody(error) ?? this.translateService.instant(`${TRANSLATION_PREFIX}revoke-failed`), TOAST_NAME_REVOKE);
    } finally {
      this.isBusy.set(false);
    }
  }

  private async loadApprovals(): Promise<void> {
    try {
      this.approvals.set(await firstValueFrom(this.standingApprovalService.getAll()));
    } catch {
      this.showError(this.translateService.instant(`${TRANSLATION_PREFIX}load-failed`), TOAST_NAME_LOAD);
    }
  }

  private async loadGroups(): Promise<void> {
    try {
      this.groups.set(await firstValueFrom(this.standingApprovalService.getGroupOptions()));
    } catch {
      this.groups.set([]);
    }
  }

  private grantErrorMessage(error: unknown): string {
    const body = this.errorBody(error);
    if (body) {
      return body;
    }

    const isConflict =
      error instanceof HttpErrorResponse && error.status === STANDING_APPROVAL_HTTP_CONFLICT;
    return this.translateService.instant(
      `${TRANSLATION_PREFIX}${isConflict ? 'grant-conflict' : 'grant-failed'}`
    );
  }

  private errorBody(error: unknown): string | null {
    if (!(error instanceof HttpErrorResponse)) {
      return null;
    }

    const body: unknown = error.error;
    if (typeof body === 'string' && body.trim() !== '') {
      return body;
    }

    if (body && typeof body === 'object') {
      const record = body as Record<string, unknown>;
      const text = record['detail'] ?? record['message'] ?? record['title'];
      if (typeof text === 'string' && text.trim() !== '') {
        return text;
      }
    }

    return null;
  }

  private isIntegerInRange(value: number, minimum: number, maximum: number): boolean {
    return Number.isInteger(value) && value >= minimum && value <= maximum;
  }

  private showError(message: string, name: string): void {
    this.toastShowService.showError(message, name);
  }
}
