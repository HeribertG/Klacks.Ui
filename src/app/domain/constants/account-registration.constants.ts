// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Error code and reason codes of a rejected account registration (HTTP 400 problem details with an error code
 * and a reasons array), mirrored from the backend error code constants and checked against them by a backend
 * guard test. The reasons are ASP.NET Identity error codes.
 */
export const ACCOUNT_REGISTRATION_REJECTED_ERROR_CODE = 'ACCOUNT_REGISTRATION_REJECTED';

export const ACCOUNT_REGISTRATION_REASONS = {
  PASSWORD_TOO_SHORT: 'PasswordTooShort',
  PASSWORD_REQUIRES_DIGIT: 'PasswordRequiresDigit',
  PASSWORD_REQUIRES_NON_ALPHANUMERIC: 'PasswordRequiresNonAlphanumeric',
  PASSWORD_REQUIRES_UPPER: 'PasswordRequiresUpper',
  PASSWORD_REQUIRES_LOWER: 'PasswordRequiresLower',
  PASSWORD_REQUIRES_UNIQUE_CHARS: 'PasswordRequiresUniqueChars',
  DUPLICATE_EMAIL: 'DuplicateEmail',
  DUPLICATE_USER_NAME: 'DuplicateUserName',
  INVALID_EMAIL: 'InvalidEmail',
  INVALID_USER_NAME: 'InvalidUserName',
} as const;
