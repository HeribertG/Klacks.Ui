// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IComplianceEnforcementSettings } from './compliance-enforcement-settings.interface';
import { ComplianceEnforcementDefaultMode } from './compliance-enforcement-default-mode.type';
import { ComplianceEnforcementRuleMode } from './compliance-enforcement-rule-mode.type';

export class ComplianceEnforcementSettings implements IComplianceEnforcementSettings {
  enforcementDefaultMode: ComplianceEnforcementDefaultMode = 'warn';
  enforcementAllowSupervisorOverride = true;
  enforcementMaxDailyHours: ComplianceEnforcementRuleMode = '';
  enforcementMaxWeeklyHours: ComplianceEnforcementRuleMode = '';
  enforcementMinRestHours: ComplianceEnforcementRuleMode = '';
  enforcementMinRestDays: ComplianceEnforcementRuleMode = '';
  enforcementMaxConsecutiveDays: ComplianceEnforcementRuleMode = '';
  enforcementPeriodCap: ComplianceEnforcementRuleMode = '';
  enforcementRollingAverage: ComplianceEnforcementRuleMode = '';
  enforcementRestDayRotation: ComplianceEnforcementRuleMode = '';
  enforcementCounterRule: ComplianceEnforcementRuleMode = '';
  enforcementCompensatoryRest: ComplianceEnforcementRuleMode = '';
  enforcementRestrictedTimeWindow: ComplianceEnforcementRuleMode = '';
  enforcementHolidayWork: ComplianceEnforcementRuleMode = '';
  rosterPublicationMinLeadDays = 0;
  rosterPublicationCountWorkdaysOnly = false;
  planningDeadlineLeadDays = 0;
}
