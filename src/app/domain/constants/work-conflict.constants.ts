// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Constants for the structured answer of the backend when a work booking is refused (409 conflicts and 400 refusals).
 * @param ERROR_CODES - Machine-readable errorCode values of the 409 body (mirror of the backend WorkWriteConflictCodes)
 * @param REFUSAL_CODES - Machine-readable errorCode values of the 400 body (mirror of the backend WorkBookingRefusalCodes)
 * @param QUALIFICATION_VALIDATION_KEYS - Validation keys of a mandatory-qualification gap carried in a conflict item
 * @param MESSAGE_KEYS - Translation keys of the user-facing messages (QUALIFICATION_LEVEL_HELD names the held level
 *   next to the required one; QUALIFICATION_LEVEL is the fallback when the held level is not sent)
 * @param PERIOD_KEYS - Translation keys of a half-open period ("from X" / "until X"); a closed period joins both bounds
 * @param PERIOD_SEPARATOR - Joins the two bounds of a closed period
 * @param CONFLICT_STATUS / REFUSED_STATUS - HTTP status of the 409 conflicts and of the 400 refusals
 * @param TOAST_NAME - Toast name, so a repeated refusal replaces the shown toast instead of stacking
 * @param MAX_LINES - Number of conflicts spelled out in one toast
 */
export const WORK_CONFLICT = {
  ERROR_CODES: {
    BLOCKED: 'WORK_BLOCKED_BY_CONFLICTS',
    SPORADIC_DAY_FULL: 'SPORADIC_SHIFT_DAY_FULL',
    SPORADIC_RANGE_EXHAUSTED: 'SPORADIC_SHIFT_RANGE_EXHAUSTED',
  },
  REFUSAL_CODES: {
    DAY_SEALED: 'DAY_SEALED',
    OUTSIDE_MEMBERSHIP_PERIOD: 'OUTSIDE_MEMBERSHIP_PERIOD',
    OUTSIDE_GROUP_PERIOD: 'OUTSIDE_GROUP_PERIOD',
    WORK_IN_CLOSED_PERIOD: 'WORK_IN_CLOSED_PERIOD',
    WORK_SEALED_ROLE_REQUIRED: 'WORK_SEALED_ROLE_REQUIRED',
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
    QUALIFICATION_LEVEL_HELD: 'schedule.workConflict.qualificationLevelHeld',
    BLOCKED: 'schedule.workConflict.blocked',
    SPORADIC_DAY_FULL: 'schedule.workConflict.sporadicDayFull',
    SPORADIC_RANGE_EXHAUSTED: 'schedule.workConflict.sporadicRangeExhausted',
    DAY_SEALED: 'schedule.workConflict.daySealed',
    OUTSIDE_MEMBERSHIP_PERIOD: 'schedule.workConflict.outsideMembershipPeriod',
    OUTSIDE_GROUP_PERIOD: 'schedule.workConflict.outsideGroupPeriod',
    WORK_IN_CLOSED_PERIOD: 'schedule.workConflict.workInClosedPeriod',
    WORK_SEALED_ROLE_REQUIRED: 'schedule.workConflict.workSealedRoleRequired',
  },
  PERIOD_KEYS: {
    FROM: 'schedule.workConflict.periodFrom',
    UNTIL: 'schedule.workConflict.periodUntil',
  },
  PERIOD_SEPARATOR: ' – ',
  CONFLICT_STATUS: 409,
  REFUSED_STATUS: 400,
  TOAST_NAME: 'WORK_CONFLICT',
  MAX_LINES: 3,
  QUALIFICATION_ID_PARAM: 'qualificationId',
  MIN_LEVEL_PARAM: 'minLevel',
} as const;

export const WORK_CONFLICT_ERROR_CODE_VALUES: readonly string[] = Object.values(WORK_CONFLICT.ERROR_CODES);

export const WORK_REFUSAL_ERROR_CODE_VALUES: readonly string[] = Object.values(WORK_CONFLICT.REFUSAL_CODES);
