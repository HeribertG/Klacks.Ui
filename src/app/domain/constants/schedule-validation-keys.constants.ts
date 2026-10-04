// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Translation keys of schedule validation entries, mirroring the backend's ScheduleValidationKeys.
 * WEEK_SCOPED_VALIDATION_KEYS lists the entries the backend re-evaluates for a whole ISO week whenever
 * a single day of that week is checked. Their date can be any day of the week — the weekly checks
 * anchor on Monday, the consecutive-day check on the day its run starts — so the live merge has to
 * retract them by week rather than by exact date.
 * SCHEDULE_VALIDATION_KEY_REST_VIOLATION is dated with the day of the PREVIOUS block's owner, so the pair
 * (X-1 -> X) sits on X-1; a re-check of day X therefore also retracts that key on X-1.
 */
export const SCHEDULE_VALIDATION_KEY_WEEKLY_OVERTIME =
  'schedule.error-list.weekly-overtime';
export const SCHEDULE_VALIDATION_KEY_MIN_REST_DAYS =
  'schedule.error-list.min-rest-days';
export const SCHEDULE_VALIDATION_KEY_REST_VIOLATION =
  'schedule.error-list.rest-violation';
export const SCHEDULE_VALIDATION_KEY_CONSECUTIVE_DAYS =
  'schedule.error-list.consecutive-days';

export const SCHEDULE_VALIDATION_KEY_PLANNING_RULE =
  'schedule.error-list.planning-rule';
export const SCHEDULE_VALIDATION_KEY_PLANNING_RULE_INVALID =
  'schedule.error-list.planning-rule-invalid';
export const SCHEDULE_VALIDATION_KEY_COUNTER_RULE =
  'schedule.error-list.counter-rule';

/**
 * Parameters that identify one rule finding independent of its observed value: the planning-rule id, or for a
 * counter rule (which carries no id) its event, period and threshold.
 */
export const RULE_FINDING_IDENTITY_PARAMS: readonly string[] = ['ruleId', 'event', 'period', 'threshold'];

/**
 * Validation keys the backend may send without a client (ClientId = empty GUID): team fairness and an invalid
 * planning rule concern the team or the company, not one person, and are listed as a team entry.
 */
export const TEAM_SCOPED_VALIDATION_KEYS: readonly string[] = [
  SCHEDULE_VALIDATION_KEY_PLANNING_RULE,
  SCHEDULE_VALIDATION_KEY_PLANNING_RULE_INVALID,
];

export const SCHEDULE_ERROR_LIST_TEAM_ENTRY_KEY = 'schedule.error-list.team-entry';
export const PLANNING_RULE_KIND_KEY_PREFIX = 'planning-rule-kind.';
export const PLANNING_RULE_KIND_PARAM = 'kind';
export const PLANNING_RULE_ID_PARAM = 'ruleId';

export const WEEK_SCOPED_VALIDATION_KEYS: readonly string[] = [
  SCHEDULE_VALIDATION_KEY_WEEKLY_OVERTIME,
  SCHEDULE_VALIDATION_KEY_MIN_REST_DAYS,
  SCHEDULE_VALIDATION_KEY_CONSECUTIVE_DAYS,
];

export const SCHEDULE_ERROR_LIST_PRE_EXISTING_KEY = 'schedule.error-list.pre-existing';
export const SCHEDULE_ERROR_LIST_PRE_EXISTING_HINT_KEY = 'schedule.error-list.pre-existing-hint';
export const PLANNING_RULE_REMAINING_PRE_EXISTING_KEY = 'schedule.planning-rule-remaining.pre-existing';
export const PLANNING_RULE_REMAINING_ADDED_KEY = 'schedule.planning-rule-remaining.added';
export const PLANNING_RULE_REMAINING_COUNTS_KEY = 'schedule.planning-rule-remaining.counts';
