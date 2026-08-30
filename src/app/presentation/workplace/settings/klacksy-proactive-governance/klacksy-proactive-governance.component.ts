// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings card deciding how far Klacksy may go on its own: a global autonomy level capping
 * everything from above, plus per finding type report it, additionally lay a ready scenario next
 * to it, or additionally carry it out. Saves each change immediately, the
 * way the other assistant cards do, and reloads the whole picture from the answer so the effective
 * ceiling stays truthful when the master off switch is on. Loads the account list itself, because the
 * Klacksy settings section has no neighbour that would do it.
 * @param governance - Shared service signal holding the current rules and master off switch state
 * @param isLoading - Signal set while the initial GET is running
 * @param savingKind - Finding type whose row is currently being saved, or null
 */

import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { ProactiveGovernanceService } from 'src/app/domain/services/assistant/proactive-governance.service';
import { UserAdministrationManagementService } from 'src/app/domain/services/settings/user-administration-management.service';
import { IProactiveGovernanceRule } from 'src/app/domain/models/assistant/proactive-governance-rule.interface';
import { IProactiveGovernanceUpdate } from 'src/app/domain/models/assistant/proactive-governance-update.interface';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { PROACTIVE_MAX_ACTIONS } from './proactive-max-action.constants';

const KILL_SWITCH_ROW_KEY = '*';
const LEVEL_ROW_KEY = 'level';

interface GlobalLevelOption {
  value: number;
  labelKey: string;
}

@Component({
  selector: 'app-klacksy-proactive-governance',
  templateUrl: './klacksy-proactive-governance.component.html',
  styleUrls: ['./klacksy-proactive-governance.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KlacksyProactiveGovernanceComponent implements OnInit {
  private proactiveGovernanceService = inject(ProactiveGovernanceService);
  private userAdministrationManagementService = inject(UserAdministrationManagementService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);

  readonly governance = this.proactiveGovernanceService.governance;
  readonly isLoading = signal(true);
  readonly savingKind = signal<string | null>(null);

  readonly maxActions = PROACTIVE_MAX_ACTIONS;
  readonly rules = computed(() => this.governance()?.rules ?? []);
  readonly globalLevel = computed(() => this.governance()?.globalAutonomyLevel ?? 0);
  readonly killSwitchActive = computed(() => this.governance()?.killSwitchActive ?? false);
  readonly isSavingKillSwitch = computed(() => this.savingKind() === KILL_SWITCH_ROW_KEY);
  readonly accounts = this.userAdministrationManagementService.accountsList;

  readonly levels: GlobalLevelOption[] = [
    { value: 0, labelKey: 'setting.proactiveGovernance.global-level-0' },
    { value: 1, labelKey: 'setting.proactiveGovernance.global-level-1' },
    { value: 2, labelKey: 'setting.proactiveGovernance.global-level-2' },
    { value: 3, labelKey: 'setting.proactiveGovernance.global-level-3' },
  ];

  async ngOnInit(): Promise<void> {
    this.userAdministrationManagementService.loadAccounts();
    try {
      await firstValueFrom(this.proactiveGovernanceService.get());
    } catch {
      this.showError('setting.proactiveGovernance.load-failed');
    } finally {
      this.isLoading.set(false);
    }
  }

  labelKeyFor(triggerKind: string): string {
    return `setting.proactiveGovernance.kind.${triggerKind}`;
  }

  isSaving(triggerKind: string): boolean {
    return this.savingKind() === triggerKind;
  }

  async onToggleKillSwitch(active: boolean): Promise<void> {
    await this.save(KILL_SWITCH_ROW_KEY, { killSwitch: active });
  }

  async onSelectLevel(level: number): Promise<void> {
    if (level === this.globalLevel()) {
      return;
    }

    await this.save(LEVEL_ROW_KEY, { autonomyLevel: level });
  }

  async onChangeMaxAction(rule: IProactiveGovernanceRule, rawValue: string): Promise<void> {
    const maxAction = Number(rawValue);
    if (maxAction === rule.maxAction) {
      return;
    }

    await this.save(rule.triggerKind, { triggerKind: rule.triggerKind, maxAction });
  }

  async onToggleEnabled(rule: IProactiveGovernanceRule, enabled: boolean): Promise<void> {
    await this.save(rule.triggerKind, { triggerKind: rule.triggerKind, enabled });
  }

  async onChangeResponsibleOwner(
    rule: IProactiveGovernanceRule,
    rawValue: string
  ): Promise<void> {
    const update: IProactiveGovernanceUpdate = rawValue
      ? { triggerKind: rule.triggerKind, responsibleOwnerUserId: rawValue }
      : { triggerKind: rule.triggerKind, clearResponsibleOwner: true };

    await this.save(rule.triggerKind, update);
  }

  async onChangeDailyActionBudget(
    rule: IProactiveGovernanceRule,
    rawValue: string
  ): Promise<void> {
    await this.saveNumber(rule, rawValue, rule.dailyActionBudget, (value) => ({
      triggerKind: rule.triggerKind,
      dailyActionBudget: value,
    }));
  }

  async onChangeWindowActionLimit(
    rule: IProactiveGovernanceRule,
    rawValue: string
  ): Promise<void> {
    await this.saveNumber(rule, rawValue, rule.windowActionLimit, (value) => ({
      triggerKind: rule.triggerKind,
      windowActionLimit: value,
    }));
  }

  async onChangeWindowMinutes(rule: IProactiveGovernanceRule, rawValue: string): Promise<void> {
    await this.saveNumber(rule, rawValue, rule.windowMinutes, (value) => ({
      triggerKind: rule.triggerKind,
      windowMinutes: value,
    }));
  }

  private async saveNumber(
    rule: IProactiveGovernanceRule,
    rawValue: string,
    currentValue: number,
    toUpdate: (value: number) => IProactiveGovernanceUpdate
  ): Promise<void> {
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value === currentValue) {
      return;
    }

    await this.save(rule.triggerKind, toUpdate(value));
  }

  private async save(rowKey: string, update: IProactiveGovernanceUpdate): Promise<void> {
    if (this.savingKind() !== null) {
      return;
    }

    this.savingKind.set(rowKey);
    try {
      await firstValueFrom(this.proactiveGovernanceService.update(update));
    } catch {
      this.showError('setting.proactiveGovernance.save-failed');
      try {
        await firstValueFrom(this.proactiveGovernanceService.get());
      } catch {
        this.showError('setting.proactiveGovernance.load-failed');
      }
    } finally {
      this.savingKind.set(null);
    }
  }

  private showError(messageKey: string): void {
    this.toastShowService.showError(
      this.translateService.instant(messageKey),
      this.translateService.instant('setting.proactiveGovernance.headline')
    );
  }
}
