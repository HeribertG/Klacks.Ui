// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import {
  ComplianceEnforcementDefaultMode,
} from 'src/app/domain/models/settings/compliance-enforcement-default-mode.type';
import { ComplianceEnforcementRuleMode } from 'src/app/domain/models/settings/compliance-enforcement-rule-mode.type';

export interface ComplianceEnforcementFormModel {
  enforcementDefaultMode: ComplianceEnforcementDefaultMode;
  enforcementAllowSupervisorOverride: boolean;
  enforcementMaxDailyHours: ComplianceEnforcementRuleMode;
  enforcementMaxWeeklyHours: ComplianceEnforcementRuleMode;
  enforcementMinRestHours: ComplianceEnforcementRuleMode;
  enforcementMinRestDays: ComplianceEnforcementRuleMode;
  enforcementMaxConsecutiveDays: ComplianceEnforcementRuleMode;
  enforcementPeriodCap: ComplianceEnforcementRuleMode;
  enforcementRollingAverage: ComplianceEnforcementRuleMode;
  enforcementRestDayRotation: ComplianceEnforcementRuleMode;
  enforcementCounterRule: ComplianceEnforcementRuleMode;
  enforcementCompensatoryRest: ComplianceEnforcementRuleMode;
  enforcementRestrictedTimeWindow: ComplianceEnforcementRuleMode;
  enforcementHolidayWork: ComplianceEnforcementRuleMode;
  rosterPublicationMinLeadDays: number;
  rosterPublicationCountWorkdaysOnly: boolean;
  planningDeadlineLeadDays: number;
}
