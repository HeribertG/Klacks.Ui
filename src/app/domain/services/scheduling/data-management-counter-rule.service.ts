// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Domain service that manages CounterRule state and CRUD orchestration.
 * Holds the in-memory rule list, exposes a read-signal for change detection,
 * and validates rules before persistence.
 * @param eventBus - Publishes domain error events on failed operations.
 * @param apiService - Infrastructure client for CounterRule requests.
 * @param translate - Resolves validation message keys to localized strings.
 */
import { inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  ICounterRule,
  CounterRule,
} from 'src/app/domain/models/scheduling/counter-rule.model';
import { CounterEventType } from 'src/app/domain/enums/counter-rule.enums';
import { CounterRuleApiService } from 'src/app/infrastructure/api/scheduling/counter-rule-api.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { DomainMessages } from 'src/app/domain/constants/messages';

@Injectable({
  providedIn: 'root',
})
export class DataManagementCounterRuleService {
  private eventBus = inject(EVENT_BUS_TOKEN);
  private apiService = inject(CounterRuleApiService);
  private translate = inject(TranslateService);

  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean {
    return this._showProgressSpinner();
  }

  public isRead = signal(false);
  public rules: ICounterRule[] = [];
  public editRule: ICounterRule | undefined;

  async init(): Promise<void> {
    await this.readRules();
  }

  private fireIsReadEvent(): void {
    this.isRead.set(true);
    setTimeout(() => this.isRead.set(false), 100);
  }

  async readRules(): Promise<ICounterRule[]> {
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
        context: 'DataManagementCounterRuleService.readRules',
      });
      console.error('Error loading counter rules:', error);
      return [];
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  createRule(): CounterRule {
    return new CounterRule();
  }

  async saveExistingRule(rule: ICounterRule): Promise<boolean> {
    this._showProgressSpinner.set(true);

    this.normalizeRule(rule);

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
      console.error('Error saving counter rule:', error);
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
        context: 'DataManagementCounterRuleService.deleteRule',
      });
      console.error('Error deleting counter rule:', error);
      return false;
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  validateRule(rule: ICounterRule): string[] {
    const errors: string[] = [];

    if (rule.threshold === null || rule.threshold <= 0) {
      errors.push(
        this.translate.instant('setting.counterRule.validation.thresholdPositive')
      );
    }

    if (rule.eventType === CounterEventType.ShiftExceedingHours) {
      if (rule.hoursThreshold === null || rule.hoursThreshold <= 0) {
        errors.push(
          this.translate.instant('setting.counterRule.validation.hoursThresholdRequired')
        );
      }
    }

    return errors;
  }

  private normalizeRule(rule: ICounterRule): void {
    if (rule.eventType !== CounterEventType.ShiftExceedingHours) {
      rule.hoursThreshold = null;
    }
    if (rule.schedulingRuleId !== null && rule.schedulingRuleId.trim() === '') {
      rule.schedulingRuleId = null;
    }
  }
}
