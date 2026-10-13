// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Reads a rejected account registration (HTTP 400 with the account-registration error code and a reasons array)
 * and maps its reason codes to translation keys and to the form field they concern. A reason code this client
 * does not know (a newer backend) maps to the generic unknown-reason text instead of a raw key, and concerns no
 * particular field.
 * @param error - Failed request as delivered by HttpClient
 * @param reason - ASP.NET Identity error code taken from the reasons array
 */
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import {
  ACCOUNT_REGISTRATION_REASONS,
  ACCOUNT_REGISTRATION_REJECTED_ERROR_CODE,
} from 'src/app/domain/constants/account-registration.constants';

export const ACCOUNT_REGISTRATION_REASON_KEY_PREFIX = 'accountRegistration.reason.';
export const ACCOUNT_REGISTRATION_UNKNOWN_REASON_KEY = `${ACCOUNT_REGISTRATION_REASON_KEY_PREFIX}unknown`;

export const ACCOUNT_REGISTRATION_REASON_TARGET = {
  PASSWORD: 'password',
  EMAIL: 'email',
  GENERAL: 'general',
} as const;

export type AccountRegistrationReasonTarget =
  (typeof ACCOUNT_REGISTRATION_REASON_TARGET)[keyof typeof ACCOUNT_REGISTRATION_REASON_TARGET];

const KNOWN_REASONS: readonly string[] = Object.values(ACCOUNT_REGISTRATION_REASONS);

const PASSWORD_REASONS: readonly string[] = [
  ACCOUNT_REGISTRATION_REASONS.PASSWORD_TOO_SHORT,
  ACCOUNT_REGISTRATION_REASONS.PASSWORD_REQUIRES_DIGIT,
  ACCOUNT_REGISTRATION_REASONS.PASSWORD_REQUIRES_NON_ALPHANUMERIC,
  ACCOUNT_REGISTRATION_REASONS.PASSWORD_REQUIRES_UPPER,
  ACCOUNT_REGISTRATION_REASONS.PASSWORD_REQUIRES_LOWER,
  ACCOUNT_REGISTRATION_REASONS.PASSWORD_REQUIRES_UNIQUE_CHARS,
];

const EMAIL_REASONS: readonly string[] = [
  ACCOUNT_REGISTRATION_REASONS.DUPLICATE_EMAIL,
  ACCOUNT_REGISTRATION_REASONS.INVALID_EMAIL,
];

/** Returns the reasons of a rejected registration, or null when the error is anything else. */
export function readAccountRegistrationRejectionReasons(error: unknown): string[] | null {
  if (!(error instanceof HttpErrorResponse) || error.status !== HttpStatusCode.BadRequest) {
    return null;
  }

  const body = error.error as Record<string, unknown> | null;
  if (!body || typeof body !== 'object' || body['errorCode'] !== ACCOUNT_REGISTRATION_REJECTED_ERROR_CODE) {
    return null;
  }

  const reasons = body['reasons'];
  return Array.isArray(reasons) ? reasons.filter((reason): reason is string => typeof reason === 'string') : [];
}

export function accountRegistrationReasonKey(reason: string): string {
  return KNOWN_REASONS.includes(reason)
    ? `${ACCOUNT_REGISTRATION_REASON_KEY_PREFIX}${reason}`
    : ACCOUNT_REGISTRATION_UNKNOWN_REASON_KEY;
}

/** Translation keys of the given reasons in their order, without duplicates (two unknown codes give one text). */
export function accountRegistrationReasonKeys(reasons: readonly string[]): string[] {
  return [...new Set(reasons.map(accountRegistrationReasonKey))];
}

export function accountRegistrationReasonTarget(reason: string): AccountRegistrationReasonTarget {
  if (PASSWORD_REASONS.includes(reason)) {
    return ACCOUNT_REGISTRATION_REASON_TARGET.PASSWORD;
  }
  if (EMAIL_REASONS.includes(reason)) {
    return ACCOUNT_REGISTRATION_REASON_TARGET.EMAIL;
  }
  return ACCOUNT_REGISTRATION_REASON_TARGET.GENERAL;
}
