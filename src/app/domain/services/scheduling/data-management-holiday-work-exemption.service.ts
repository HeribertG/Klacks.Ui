// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Holds the holiday-work exemptions and the scheduling rules needed to name their scope.
 * Two rule lists on purpose: the selectable ones drive the picker for a new exemption, while the
 * full list resolves the names of rules an existing exemption points at - a rule whose industry was
 * deactivated is no longer selectable but its exemption must still read as more than a bare id.
 */
import { inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { IHolidayWorkExemption } from 'src/app/domain/models/scheduling/holiday-work-exemption.model';
import { ISchedulingRule } from 'src/app/domain/models/scheduling/scheduling-rule.model';
import { SchedulingRuleApiService } from 'src/app/infrastructure/api/scheduling/scheduling-rule-api.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { resetSignalAfterDelay } from 'src/app/shared/helpers/signal-pulse.helper';

@Injectable({
  providedIn: 'root',
})
export class DataManagementHolidayWorkExemptionService {
  private eventBus = inject(EVENT_BUS_TOKEN);
  private apiService = inject(SchedulingRuleApiService);
  private translate = inject(TranslateService);

  private _showProgressSpinner = signal(false);
  get showProgressSpinner(): boolean {
    return this._showProgressSpinner();
  }

  public isRead = signal(false);
  public exemptions: IHolidayWorkExemption[] = [];
  public selectableRules: ISchedulingRule[] = [];
  private ruleNamesById = new Map<string, string>();

  async init(): Promise<void> {
    await Promise.all([this.readExemptions(), this.readRules()]);
  }

  private fireIsReadEvent(): void {
    this.isRead.set(true);
    resetSignalAfterDelay(this.isRead);
  }

  async readExemptions(): Promise<IHolidayWorkExemption[]> {
    this._showProgressSpinner.set(true);

    try {
      const result = await this.apiService.getHolidayWorkExemptions();
      this.exemptions = Array.isArray(result) ? [...result] : [];
      this.fireIsReadEvent();
      return this.exemptions;
    } catch (error) {
      this.eventBus.emit(DomainEventType.ERROR, {
        message: DomainMessages.UNKNOWN_ERROR,
        code: 'errorLoadingData',
        context: 'DataManagementHolidayWorkExemptionService.readExemptions',
      });
      console.error('Error loading holiday work exemptions:', error);
      return [];
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  private async readRules(): Promise<void> {
    try {
      const [selectable, all] = await Promise.all([
        this.apiService.getSelectable(),
        this.apiService.getAll(),
      ]);

      this.selectableRules = Array.isArray(selectable) ? selectable : [];

      this.ruleNamesById.clear();
      if (Array.isArray(all)) {
        for (const rule of all) {
          if (rule.id) {
            this.ruleNamesById.set(rule.id, rule.name ?? '');
          }
        }
      }
    } catch (error) {
      console.error('Error loading scheduling rules for exemptions:', error);
      this.selectableRules = [];
    }
  }

  /**
   * Name of the rule an exemption is scoped to, or the global label when it covers everyone.
   * A rule that no longer exists falls back to the same label an unknown scope gets, so the row
   * never renders a raw id.
   * @param schedulingRuleId - Scope of the exemption, null meaning global
   */
  scopeLabel(schedulingRuleId: string | null): string {
    if (!schedulingRuleId) {
      return this.translate.instant('setting.holidayWorkExemption.scope.global');
    }

    const name = this.ruleNamesById.get(schedulingRuleId);
    return name && name.length > 0
      ? name
      : this.translate.instant('setting.holidayWorkExemption.scope.unknownRule');
  }

  createExemptionDraft(): IHolidayWorkExemption {
    return {
      id: '',
      description: '',
      schedulingRuleId: null,
      importSourceKey: '',
    };
  }

  async saveExemption(exemption: IHolidayWorkExemption): Promise<boolean> {
    this._showProgressSpinner.set(true);

    try {
      const result = await this.apiService.createHolidayWorkExemption(exemption);

      if (result) {
        await this.readExemptions();
        return true;
      }

      return false;
    } catch (error) {
      this.eventBus.emit(DomainEventType.ERROR, {
        message: DomainMessages.UNKNOWN_ERROR,
        code: 'errorSavingData',
        context: 'DataManagementHolidayWorkExemptionService.saveExemption',
      });
      console.error('Error saving holiday work exemption:', error);
      await this.readExemptions();
      return false;
    } finally {
      this._showProgressSpinner.set(false);
    }
  }

  async deleteExemption(id: string): Promise<boolean> {
    if (!id) {
      return false;
    }

    this._showProgressSpinner.set(true);

    try {
      await this.apiService.deleteHolidayWorkExemption(id);
      await this.readExemptions();
      return true;
    } catch (error) {
      this.eventBus.emit(DomainEventType.ERROR, {
        message: DomainMessages.UNKNOWN_ERROR,
        code: 'errorDeletingData',
        context: 'DataManagementHolidayWorkExemptionService.deleteExemption',
      });
      console.error('Error deleting holiday work exemption:', error);
      return false;
    } finally {
      this._showProgressSpinner.set(false);
    }
  }
}
