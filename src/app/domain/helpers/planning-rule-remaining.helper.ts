// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Presentation rules for the hard planning-rule violations that remain after a wizard run. Wizard 2 and stage 3 make
 * no hard rule worse in total but do not repair existing violations, so their notice says that and points to the
 * marked findings; when the count rose the run is said to have added violations. A run without that guarantee
 * (AutoWizard: Wizard 1 does not honour planning rules yet) only reports both counts, because a repaired and a new
 * violation can cancel out.
 * Error-list rows (hard planning-rule and counter-rule findings, the rules the run's guard evaluates) are matched by
 * client, date, key and rule identity against a snapshot taken when the run started.
 * @param remaining - Hard planning-rule findings before and after the run, null when no planning rule applies
 * @param guaranteesNoWorsening - True when every step of the run honours the hard rule guard (Wizard 2, stage 3)
 * @param entries - Error-list entries; only hard planning-rule findings take part in the snapshot
 */

import { ScheduleErrorEntry } from 'src/app/domain/interfaces/schedule-error-entry.interface';
import { PlanningRuleRemaining } from 'src/app/domain/models/schedule/planning-rule-remaining.model';
import { PlanningRuleRemainingNotice } from 'src/app/domain/models/schedule/planning-rule-remaining-notice.model';
import {
  PLANNING_RULE_REMAINING_ADDED_KEY,
  PLANNING_RULE_REMAINING_COUNTS_KEY,
  PLANNING_RULE_REMAINING_PRE_EXISTING_KEY,
  RULE_FINDING_IDENTITY_PARAMS,
  SCHEDULE_VALIDATION_KEY_COUNTER_RULE,
  SCHEDULE_VALIDATION_KEY_PLANNING_RULE,
} from 'src/app/domain/constants/schedule-validation-keys.constants';

const HARD_ENTRY_TYPE = 'error';
const KEY_SEPARATOR = '|';
const HARD_RULE_FINDING_KEYS: readonly string[] = [
  SCHEDULE_VALIDATION_KEY_PLANNING_RULE,
  SCHEDULE_VALIDATION_KEY_COUNTER_RULE,
];

export function describePlanningRuleRemaining(
  remaining: PlanningRuleRemaining | null | undefined,
  guaranteesNoWorsening: boolean,
): PlanningRuleRemainingNotice | null {
  if (!remaining || remaining.hardAfter <= 0) {
    return null;
  }
  if (remaining.hardAfter > remaining.hardBefore) {
    return {
      key: PLANNING_RULE_REMAINING_ADDED_KEY,
      params: { before: remaining.hardBefore, after: remaining.hardAfter },
    };
  }
  if (!guaranteesNoWorsening) {
    return {
      key: PLANNING_RULE_REMAINING_COUNTS_KEY,
      params: { before: remaining.hardBefore, after: remaining.hardAfter },
    };
  }
  return { key: PLANNING_RULE_REMAINING_PRE_EXISTING_KEY, params: { count: remaining.hardAfter } };
}

export function isHardPlanningRuleFinding(entry: ScheduleErrorEntry): boolean {
  return entry.type === HARD_ENTRY_TYPE && HARD_RULE_FINDING_KEYS.includes(entry.comment);
}

export function planningRuleFindingKey(entry: ScheduleErrorEntry): string {
  const identity = RULE_FINDING_IDENTITY_PARAMS.map((param) => entry.commentParams?.[param] ?? '');
  return [entry.clientId, entry.date, entry.comment, ...identity].join(KEY_SEPARATOR);
}

export function hardPlanningRuleFindingKeys(entries: readonly ScheduleErrorEntry[]): ReadonlySet<string> {
  return new Set(entries.filter(isHardPlanningRuleFinding).map(planningRuleFindingKey));
}
