// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, signal } from '@angular/core';
import { ISchedulingRule, SchedulingRule } from 'src/app/domain/models/scheduling/scheduling-rule.model';
import { SchedulingRuleApiService } from 'src/app/infrastructure/api/scheduling/scheduling-rule-api.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class DataManagementSchedulingRuleService {
  private eventBus = inject(EVENT_BUS_TOKEN);
  private apiService = inject(SchedulingRuleApiService);
  private translate = inject(TranslateService);

  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean { return this._showProgressSpinner(); }

  public isRead = signal(false);
  public rules: ISchedulingRule[] = [];
  public editRule: ISchedulingRule | undefined;

  async init(): Promise<void> {
    await this.readRules();
  }

  private fireIsReadEvent(): void {
    this.isRead.set(true);
    setTimeout(() => this.isRead.set(false), 100);
  }

  async readRules(): Promise<ISchedulingRule[]> {
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
        context: 'DataManagementSchedulingRuleService.readRules'
      });
      console.error('Error loading scheduling rules:', error);
      return [];
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  createRule(): SchedulingRule {
    const rule = new SchedulingRule();
    rule.name = '';
    return rule;
  }

  async saveExistingRule(rule: ISchedulingRule): Promise<boolean> {
    this._showProgressSpinner.set(true);

    try {
      const action = rule.id
        ? this.apiService.update(rule)
        : this.apiService.create(rule);

      const result = await action;

      if (result) {
        await this.readRules();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error saving scheduling rule:', error);
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
        context: 'DataManagementSchedulingRuleService.deleteRule'
      });
      console.error('Error deleting scheduling rule:', error);
      return false;
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  validateRule(rule: ISchedulingRule): string[] {
    const errors: string[] = [];

    if (!rule.name || rule.name.trim() === '') {
      errors.push(
        this.translate.instant('setting.schedulingRule.validation.nameRequired')
      );
    }

    if (rule.maxWorkDays !== null && rule.maxWorkDays < 0) {
      errors.push(
        this.translate.instant('setting.schedulingRule.validation.valuesPositive')
      );
    }

    if (rule.minRestDays !== null && rule.minRestDays < 0) {
      errors.push(
        this.translate.instant('setting.schedulingRule.validation.valuesPositive')
      );
    }

    if (rule.minPauseHours !== null && rule.minPauseHours < 0) {
      errors.push(
        this.translate.instant('setting.schedulingRule.validation.valuesPositive')
      );
    }

    if (rule.maxOptimalGap !== null && rule.maxOptimalGap < 0) {
      errors.push(
        this.translate.instant('setting.schedulingRule.validation.valuesPositive')
      );
    }

    if (rule.maxDailyHours !== null && rule.maxDailyHours < 0) {
      errors.push(
        this.translate.instant('setting.schedulingRule.validation.valuesPositive')
      );
    }

    if (rule.maxWeeklyHours !== null && rule.maxWeeklyHours < 0) {
      errors.push(
        this.translate.instant('setting.schedulingRule.validation.valuesPositive')
      );
    }

    if (rule.maxConsecutiveDays !== null && rule.maxConsecutiveDays < 0) {
      errors.push(
        this.translate.instant('setting.schedulingRule.validation.valuesPositive')
      );
    }

    return errors;
  }
}
