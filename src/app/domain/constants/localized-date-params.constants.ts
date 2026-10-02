// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Names of backend translation parameters that carry a date, so the UI can show them in the reader's
 * locale instead of the wire format. Matching is by name only, never by guessing from the value: the
 * list mirrors the params the Api puts on schedule error-list findings (PreCommitConflictChecker
 * "validUntil", CompensatoryRestEvaluator "triggerDate"/"dueDate", RestrictedTimeWindowEvaluator
 * "seasonFrom"/"seasonTo"). Other date-like params (e.g. the pre-formatted proactive-message dates)
 * belong to different keys and are deliberately not listed.
 * CALENDAR_DATE_PARAM_KEYS carry a full calendar date ("yyyy-MM-dd"); MONTH_DAY_PARAM_KEYS carry a
 * yearly recurring day ("MM-dd") without a year.
 */
export const CALENDAR_DATE_PARAM_KEYS: readonly string[] = ['validUntil', 'triggerDate', 'dueDate'];

export const MONTH_DAY_PARAM_KEYS: readonly string[] = ['seasonFrom', 'seasonTo'];
