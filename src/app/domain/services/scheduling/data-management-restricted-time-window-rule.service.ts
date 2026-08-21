// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Data-management service for RestrictedTimeWindowRule entities.
 * Holds the in-memory list, tracks read state and progress-spinner visibility,
 * and orchestrates CRUD plus client-side validation of a single rule.
 */
import { inject, Injectable, signal } from '@angular/core';
import {
  IRestrictedTimeWindowRule,
  RestrictedTimeWindowRule,
} from 'src/app/domain/models/scheduling/restricted-time-window-rule.model';
import { RestrictedTimeWindowRuleApiService } from 'src/app/infrastructure/api/scheduling/restricted-time-window-rule-api.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { TranslateService } from '@ngx-translate/core';
import { resetSignalAfterDelay } from 'src/app/shared/helpers/signal-pulse.helper';

const MIN_MONTH = 1;
const MAX_MONTH = 12;
const MIN_DAY = 1;
const MAX_DAY = 31;

@Injectable({
  providedIn: 'root',
})
export class DataManagementRestrictedTimeWindowRuleService {
  private eventBus = inject(EVENT_BUS_TOKEN);
  private apiService = inject(RestrictedTimeWindowRuleApiService);
  private translate = inject(TranslateService);

  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean {
    return this._showProgressSpinner();
  }

  public isRead = signal(false);
  public rules: IRestrictedTimeWindowRule[] = [];
  public editRule: IRestrictedTimeWindowRule | undefined;

  async init(): Promise<void> {
    await this.readRules();
  }

  private fireIsReadEvent(): void {
    this.isRead.set(true);
    resetSignalAfterDelay(this.isRead);
  }

  async readRules(): Promise<IRestrictedTimeWindowRule[]> {
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
        context: 'DataManagementRestrictedTimeWindowRuleService.readRules',
      });
      console.error('Error loading restricted time window rules:', error);
      return [];
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  createRule(): RestrictedTimeWindowRule {
    return new RestrictedTimeWindowRule();
  }

  async saveExistingRule(rule: IRestrictedTimeWindowRule): Promise<boolean> {
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
      console.error('Error saving restricted time window rule:', error);
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
        context: 'DataManagementRestrictedTimeWindowRuleService.deleteRule',
      });
      console.error('Error deleting restricted time window rule:', error);
      return false;
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  validateRule(rule: IRestrictedTimeWindowRule): string[] {
    const errors: string[] = [];

    if (
      !this.isInRange(rule.seasonFromMonth, MIN_MONTH, MAX_MONTH) ||
      !this.isInRange(rule.seasonToMonth, MIN_MONTH, MAX_MONTH)
    ) {
      errors.push(
        this.translate.instant(
          'setting.restrictedTimeWindowRule.validation.monthRange'
        )
      );
    }

    if (
      !this.isInRange(rule.seasonFromDay, MIN_DAY, MAX_DAY) ||
      !this.isInRange(rule.seasonToDay, MIN_DAY, MAX_DAY)
    ) {
      errors.push(
        this.translate.instant(
          'setting.restrictedTimeWindowRule.validation.dayRange'
        )
      );
    }

    return errors;
  }

  private isInRange(value: number, min: number, max: number): boolean {
    return value !== null && value >= min && value <= max;
  }
}
