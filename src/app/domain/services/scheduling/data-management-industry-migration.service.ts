// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Holds the contracts that still reference a scheduling rule of a no longer active industry and the
 * target rule the admin deliberately picks for each of them. Nothing is ever reassigned on its own:
 * a contract only reaches the endpoint once a target was chosen by hand and that target differs from
 * the rule the contract uses today, so an untouched list can never trigger a write.
 */
import { computed, inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { IIndustryMigrationCandidate } from 'src/app/domain/models/scheduling/industry-migration-candidate.model';
import { IContractSchedulingRuleAssignment } from 'src/app/domain/models/scheduling/contract-scheduling-rule-assignment.model';
import { ISchedulingRule } from 'src/app/domain/models/scheduling/scheduling-rule.model';
import { SchedulingRuleApiService } from 'src/app/infrastructure/api/scheduling/scheduling-rule-api.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { IndustrySlugs } from 'src/app/domain/constants/industry-slugs.constants';

export type IndustryMigrationStatus = 'idle' | 'loading' | 'loaded' | 'error';

const NO_TARGET_SELECTED = '';
const INDUSTRY_LABEL_KEY_PREFIX = 'setting.activeIndustries.';

@Injectable({
  providedIn: 'root',
})
export class DataManagementIndustryMigrationService {
  private eventBus = inject(EVENT_BUS_TOKEN);
  private apiService = inject(SchedulingRuleApiService);
  private translate = inject(TranslateService);

  private _candidates = signal<IIndustryMigrationCandidate[]>([]);
  private _selectableRules = signal<ISchedulingRule[]>([]);
  private _targetRuleIds = signal<Record<string, string>>({});
  private _status = signal<IndustryMigrationStatus>('idle');
  private _isApplying = signal(false);
  private _lastMigratedCount = signal<number | null>(null);
  private _hasSaveError = signal(false);

  public readonly candidates = this._candidates.asReadonly();
  public readonly selectableRules = this._selectableRules.asReadonly();
  public readonly status = this._status.asReadonly();
  public readonly isApplying = this._isApplying.asReadonly();
  public readonly lastMigratedCount = this._lastMigratedCount.asReadonly();
  public readonly hasSaveError = this._hasSaveError.asReadonly();

  public readonly candidateCount = computed(() => this._candidates().length);
  public readonly hasCandidates = computed(() => this._candidates().length > 0);

  public readonly pendingAssignments = computed<IContractSchedulingRuleAssignment[]>(() => {
    const targets = this._targetRuleIds();

    return this._candidates()
      .filter((candidate) => {
        const target = targets[candidate.contractId] ?? NO_TARGET_SELECTED;
        return target !== NO_TARGET_SELECTED && target !== candidate.schedulingRuleId;
      })
      .map((candidate) => ({
        contractId: candidate.contractId,
        schedulingRuleId: targets[candidate.contractId],
      }));
  });

  public readonly canApply = computed(
    () => !this._isApplying() && this.pendingAssignments().length > 0
  );

  public readonly noTargetSelected = NO_TARGET_SELECTED;

  async load(): Promise<void> {
    this._status.set('loading');
    this._hasSaveError.set(false);
    this._lastMigratedCount.set(null);

    try {
      const [candidates, selectable] = await Promise.all([
        this.apiService.getIndustryMigrationList(),
        this.apiService.getSelectable(),
      ]);

      const rules = Array.isArray(selectable) ? selectable : [];
      const rows = Array.isArray(candidates) ? candidates : [];

      this._selectableRules.set(rules);
      this._candidates.set(rows);
      this._targetRuleIds.set(this.buildInitialTargets(rows, rules));
      this._status.set('loaded');
    } catch (error) {
      this._candidates.set([]);
      this._targetRuleIds.set({});
      this._status.set('error');
      this.eventBus.emit(DomainEventType.ERROR, {
        message: DomainMessages.UNKNOWN_ERROR,
        code: 'errorLoadingData',
        context: 'DataManagementIndustryMigrationService.load',
      });
      console.error('Error loading the industry migration list:', error);
    }
  }

  targetRuleId(contractId: string): string {
    return this._targetRuleIds()[contractId] ?? NO_TARGET_SELECTED;
  }

  setTarget(contractId: string, schedulingRuleId: string): void {
    this._targetRuleIds.update((targets) => ({ ...targets, [contractId]: schedulingRuleId }));
  }

  /**
   * Readable name of the industry a candidate's rule belongs to. Unknown slugs are echoed back
   * unchanged so a rule tagged with a value outside the five canonical industries still reads as
   * something rather than as a missing translation key.
   * @param industry - Industry slug carried by the currently assigned rule
   */
  industryLabel(industry: string): string {
    const slug = (industry || '').trim().toLowerCase();

    if (!IndustrySlugs.All.includes(slug)) {
      return industry || '';
    }

    return this.translate.instant(`${INDUSTRY_LABEL_KEY_PREFIX}${slug}`);
  }

  async applyMigrations(): Promise<boolean> {
    const assignments = this.pendingAssignments();

    if (this._isApplying() || assignments.length === 0) {
      return false;
    }

    this._isApplying.set(true);
    this._hasSaveError.set(false);

    try {
      const migrated = await this.apiService.migrateContracts(assignments);
      await this.load();
      this._lastMigratedCount.set(migrated);
      return true;
    } catch (error) {
      this.eventBus.emit(DomainEventType.ERROR, {
        message: DomainMessages.UNKNOWN_ERROR,
        code: 'errorSavingData',
        context: 'DataManagementIndustryMigrationService.applyMigrations',
      });
      console.error('Error migrating contracts onto another scheduling rule:', error);
      await this.load();
      this._hasSaveError.set(true);
      return false;
    } finally {
      this._isApplying.set(false);
    }
  }

  private buildInitialTargets(
    candidates: IIndustryMigrationCandidate[],
    selectableRules: ISchedulingRule[]
  ): Record<string, string> {
    const selectableIds = new Set(selectableRules.map((rule) => rule.id));
    const targets: Record<string, string> = {};

    for (const candidate of candidates) {
      const suggested = candidate.suggestedRuleId ?? NO_TARGET_SELECTED;
      const isUsable =
        suggested !== NO_TARGET_SELECTED &&
        suggested !== candidate.schedulingRuleId &&
        selectableIds.has(suggested);

      targets[candidate.contractId] = isUsable ? suggested : NO_TARGET_SELECTED;
    }

    return targets;
  }
}
