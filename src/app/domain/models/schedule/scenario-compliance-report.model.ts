// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * End-state compliance diff of a what-if scenario against the real plan. Mirrors the backend
 * ScenarioComplianceReport/PeriodIssueDto returned by Harmonizer and Holistic Harmonizer ApplyAsScenario.
 * @param newIssues - All issues the scenario introduces that the real plan does not have
 * @param blockingIssues - Subset of newIssues enforced in Block mode; these will block Accept without an override
 */

import { ErrorListFilterType } from 'src/app/domain/interfaces/error-list-filter-type.type';
import { ScheduleErrorEntry } from 'src/app/domain/interfaces/schedule-error-entry.interface';

export interface ScenarioComplianceIssue {
  date: string;
  clientId: string;
  clientName: string;
  severity: ErrorListFilterType;
  code: string;
  messageKey: string;
  messageParams: Record<string, string>;
}

export interface ScenarioComplianceReport {
  newIssues: ScenarioComplianceIssue[];
  blockingIssues: ScenarioComplianceIssue[];
}

export function toComplianceEntries(
  report: ScenarioComplianceReport | null | undefined,
): ScheduleErrorEntry[] {
  if (!report) return [];
  return report.newIssues.map((issue) => ({
    type: issue.severity,
    clientId: issue.clientId,
    clientName: issue.clientName,
    date: issue.date,
    comment: issue.messageKey,
    commentParams: issue.messageParams,
  }));
}
