// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Holiday calendar and scheduling rule assigned in the contract dialog, with the selector labels.
 * @param rule - Scheduling rule whose option label is built, marked when its industry is inactive
 */

import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { DataManagementContractService } from 'src/app/domain/services/contract/data-management-contract.service';
import { ISchedulingRule } from 'src/app/domain/models/scheduling/scheduling-rule.interface';
import { CONTRACT_SELECTION_KEYS } from '../contracts.constants';
import { ContractEditorStateService } from './contract-editor-state.service';

@Injectable()
export class ContractAssignmentService {
  private readonly state = inject(ContractEditorStateService);
  private readonly translate = inject(TranslateService);
  private readonly dataManagementContractService = inject(DataManagementContractService);

  onCalendarSelectionChange(calendarId: string): void {
    this.state.calendarSelectionId.set(calendarId || undefined);
    if (this.state.editingContract) {
      if (calendarId) {
        const selectedCalendar =
          this.dataManagementContractService.availableCalendars.find(
            (cal) => cal.id === calendarId
          );
        this.state.editingContract.calendarSelection = selectedCalendar;
        this.state.editingContract.calendarSelectionId = calendarId;
      } else {
        this.state.editingContract.calendarSelection = undefined;
        this.state.editingContract.calendarSelectionId = undefined;
      }
    }
  }

  getSelectedCalendarName(): string {
    const selectedId = this.state.calendarSelectionId();
    if (!selectedId) {
      return this.translate.instant(CONTRACT_SELECTION_KEYS.noCalendar);
    }
    const calendar = this.dataManagementContractService.availableCalendars.find(
      (cal) => cal.id === selectedId
    );
    return calendar?.name || this.translate.instant(CONTRACT_SELECTION_KEYS.noCalendar);
  }

  onSchedulingRuleSelectionChange(ruleId: string): void {
    this.state.schedulingRuleId.set(ruleId || undefined);
    if (this.state.editingContract) {
      this.state.editingContract.schedulingRuleId = ruleId || undefined;
    }
  }

  schedulingRuleOptionLabel(rule: ISchedulingRule): string {
    return rule.id === this.state.ruleIdOutsideActiveIndustries()
      ? this.translate.instant(CONTRACT_SELECTION_KEYS.schedulingRuleInactiveIndustry, { name: rule.name })
      : rule.name;
  }

  getSelectedSchedulingRuleName(): string {
    const selectedId = this.state.schedulingRuleId();
    if (!selectedId) {
      return this.translate.instant(CONTRACT_SELECTION_KEYS.noSchedulingRule);
    }
    const rule = this.state.schedulingRuleOptions().find((r) => r.id === selectedId);
    return rule
      ? this.schedulingRuleOptionLabel(rule)
      : this.translate.instant(CONTRACT_SELECTION_KEYS.noSchedulingRule);
  }
}
