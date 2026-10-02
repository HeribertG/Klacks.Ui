// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Constants for the structured 409 answer of the backend when a work booking is refused.
 * @param ERROR_CODES - Machine-readable errorCode values of the 409 body (mirror of the backend WorkWriteConflictCodes)
 * @param QUALIFICATION_VALIDATION_KEYS - Validation keys of a mandatory-qualification gap carried in a conflict item
 * @param MESSAGE_KEYS - Translation keys of the user-facing messages
 * @param TOAST_NAME - Toast name, so a repeated refusal replaces the shown toast instead of stacking
 * @param MAX_LINES - Number of conflicts spelled out in one toast
 */
export const WORK_CONFLICT = {
  ERROR_CODES: {
    BLOCKED: 'WORK_BLOCKED_BY_CONFLICTS',
    SPORADIC_DAY_FULL: 'SPORADIC_SHIFT_DAY_FULL',
    SPORADIC_RANGE_EXHAUSTED: 'SPORADIC_SHIFT_RANGE_EXHAUSTED',
  },
  QUALIFICATION_VALIDATION_KEYS: {
    MISSING: 'schedule.error-list.qualification-missing',
    EXPIRED: 'schedule.error-list.qualification-expired',
    INSUFFICIENT_LEVEL: 'schedule.error-list.qualification-level',
  },
  MESSAGE_KEYS: {
    QUALIFICATION_MISSING: 'schedule.workConflict.qualificationMissing',
    QUALIFICATION_EXPIRED: 'schedule.workConflict.qualificationExpired',
    QUALIFICATION_LEVEL: 'schedule.workConflict.qualificationLevel',
    BLOCKED: 'schedule.workConflict.blocked',
    SPORADIC_DAY_FULL: 'schedule.workConflict.sporadicDayFull',
    SPORADIC_RANGE_EXHAUSTED: 'schedule.workConflict.sporadicRangeExhausted',
  },
  CONFLICT_STATUS: 409,
  TOAST_NAME: 'WORK_CONFLICT',
  MAX_LINES: 3,
  QUALIFICATION_ID_PARAM: 'qualificationId',
  MIN_LEVEL_PARAM: 'minLevel',
} as const;

export const WORK_CONFLICT_ERROR_CODE_VALUES: readonly string[] = Object.values(WORK_CONFLICT.ERROR_CODES);
