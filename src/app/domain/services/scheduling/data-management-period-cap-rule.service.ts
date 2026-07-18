// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Domain data-management service for PeriodCapRule entities.
 * Holds the in-memory rule list, exposes read/create/save/delete/validate and
 * normalizes payloads (empty schedulingRuleId to null, custom weeks reset)
 * before persistence.
 */
import { inject, Injectable, signal } from '@angular/core';
import {
  IPeriodCapRule,
  PeriodCapRule,
} from 'src/app/domain/models/scheduling/period-cap-rule.model';
import { PeriodCapPeriod } from 'src/app/domain/enums/period-cap-rule.enums';
import { PeriodCapRuleApiService } from 'src/app/infrastructure/api/scheduling/period-cap-rule-api.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { TranslateService } from '@ngx-translate/core';

const MIN_CUSTOM_PERIOD_WEEKS = 1;
const MAX_CUSTOM_PERIOD_WEEKS = 104;

@Injectable({
  providedIn: 'root',
})
export class DataManagementPeriodCapRuleService {
  private eventBus = inject(EVENT_BUS_TOKEN);
  private apiService = inject(PeriodCapRuleApiService);
  private translate = inject(TranslateService);

  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean {
    return this._showProgressSpinner();
  }

  public isRead = signal(false);
  public rules: IPeriodCapRule[] = [];
  public editRule: IPeriodCapRule | undefined;

  async init(): Promise<void> {
    await this.readRules();
  }

  private fireIsReadEvent(): void {
    this.isRead.set(true);
    setTimeout(() => this.isRead.set(false), 100);
  }

  async readRules(): Promise<IPeriodCapRule[]> {
    this._showProgressSpinner.set(true);

    try {
      const result = await this.apiService.getAll();
      this.rules = [];

      if (result && Array.isArray(result)) {
        this.rules.push(...result);
      }

      this.fireIsReadEvent();
      return this.rules;
    } catch (error) {
      this.eventBus.emit(DomainEventType.ERROR, {
        message: DomainMessages.UNKNOWN_ERROR,
        code: 'errorLoadingData',
        context: 'DataManagementPeriodCapRuleService.readRules',
      });
      console.error('Error loading period cap rules:', error);
      return [];
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  createRule(): PeriodCapRule {
    return new PeriodCapRule();
  }

  async saveExistingRule(rule: IPeriodCapRule): Promise<boolean> {
    this._showProgressSpinner.set(true);

    try {
      const payload = this.normalizeRule(rule);
      const action = payload.id
        ? this.apiService.update(payload)
        : this.apiService.create(payload);

      const result = await action;

      if (result) {
        await this.readRules();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error saving period cap rule:', error);
      await this.readRules();
      return false;
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  async deleteRule(id: string): Promise<boolean> {
    if (!id) {
      return false;
    }

    this._showProgressSpinner.set(true);

    try {
      await this.apiService.delete(id);
      await this.readRules();
      return true;
    } catch (error) {
      this.eventBus.emit(DomainEventType.ERROR, {
        message: DomainMessages.UNKNOWN_ERROR,
        code: 'errorDeletingData',
        context: 'DataManagementPeriodCapRuleService.deleteRule',
      });
      console.error('Error deleting period cap rule:', error);
      return false;
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  validateRule(rule: IPeriodCapRule): string[] {
    const errors: string[] = [];

    const hasFixed = rule.capHours != null && rule.capHours > 0;
    const rollingWeeks = rule.rollingWindowWeeks ?? 0;
    const rollingAverage = rule.maxAverageWeeklyHours ?? 0;
    const rollingTouched = rollingWeeks > 0 || rollingAverage > 0;
    const rollingComplete = rollingWeeks > 0 && rollingAverage > 0;

    if (!hasFixed && !rollingTouched) {
      errors.push(
        this.translate.instant('setting.periodCapRule.validation.modeRequired')
      );
    }

    if (hasFixed && rollingTouched) {
      errors.push(
        this.translate.instant('setting.periodCapRule.validation.modeExclusive')
      );
    }

    if (rollingTouched && !rollingComplete) {
      errors.push(
        this.translate.instant(
          'setting.periodCapRule.validation.rollingIncomplete'
        )
      );
    }

    if (rule.period === PeriodCapPeriod.CustomWeeks) {
      const weeks = rule.customPeriodWeeks;
      if (weeks == null) {
        errors.push(
          this.translate.instant(
            'setting.periodCapRule.validation.customWeeksRequired'
          )
        );
      } else if (
        weeks < MIN_CUSTOM_PERIOD_WEEKS ||
        weeks > MAX_CUSTOM_PERIOD_WEEKS
      ) {
        errors.push(
          this.translate.instant(
            'setting.periodCapRule.validation.customWeeksRange'
          )
        );
      }
    }

    return errors;
  }

  private normalizeRule(rule: IPeriodCapRule): IPeriodCapRule {
    const schedulingRuleId =
      rule.schedulingRuleId && rule.schedulingRuleId.trim() !== ''
        ? rule.schedulingRuleId.trim()
        : null;

    const customPeriodWeeks =
      rule.period === PeriodCapPeriod.CustomWeeks
        ? rule.customPeriodWeeks
        : null;

    return {
      ...rule,
      capHours: rule.capHours ?? 0,
      schedulingRuleId,
      customPeriodWeeks,
    };
  }
}
