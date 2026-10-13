// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpErrorResponse } from '@angular/common/http';
import {
  ACCOUNT_REGISTRATION_REASONS,
  ACCOUNT_REGISTRATION_REJECTED_ERROR_CODE,
} from 'src/app/domain/constants/account-registration.constants';
import {
  ACCOUNT_REGISTRATION_REASON_TARGET,
  ACCOUNT_REGISTRATION_UNKNOWN_REASON_KEY,
  accountRegistrationReasonKey,
  accountRegistrationReasonKeys,
  accountRegistrationReasonTarget,
  readAccountRegistrationRejectionReasons,
} from './account-registration-rejection.helper';

const BAD_REQUEST = 400;
const CONFLICT = 409;
const UNKNOWN_CODE = 'SomethingNewFromIdentity';

const rejection = (body: unknown, status = BAD_REQUEST): HttpErrorResponse =>
  new HttpErrorResponse({ status, error: body });

describe('readAccountRegistrationRejectionReasons', () => {
  it('returns the reasons of a rejected registration', () => {
    const error = rejection({
      errorCode: ACCOUNT_REGISTRATION_REJECTED_ERROR_CODE,
      reasons: [ACCOUNT_REGISTRATION_REASONS.PASSWORD_TOO_SHORT, ACCOUNT_REGISTRATION_REASONS.DUPLICATE_EMAIL],
    });

    expect(readAccountRegistrationRejectionReasons(error)).toEqual([
      ACCOUNT_REGISTRATION_REASONS.PASSWORD_TOO_SHORT,
      ACCOUNT_REGISTRATION_REASONS.DUPLICATE_EMAIL,
    ]);
  });

  it('drops reason entries that are not strings', () => {
    const error = rejection({
      errorCode: ACCOUNT_REGISTRATION_REJECTED_ERROR_CODE,
      reasons: [ACCOUNT_REGISTRATION_REASONS.INVALID_EMAIL, 42, null],
    });

    expect(readAccountRegistrationRejectionReasons(error)).toEqual([ACCOUNT_REGISTRATION_REASONS.INVALID_EMAIL]);
  });

  it('returns no reasons when the rejection carries no reasons array', () => {
    const error = rejection({ errorCode: ACCOUNT_REGISTRATION_REJECTED_ERROR_CODE });

    expect(readAccountRegistrationRejectionReasons(error)).toEqual([]);
  });

  it('ignores a 400 without the rejection error code', () => {
    expect(readAccountRegistrationRejectionReasons(rejection({ title: 'Bad Request' }))).toBeNull();
  });

  it('ignores the rejection error code on another status', () => {
    const error = rejection({ errorCode: ACCOUNT_REGISTRATION_REJECTED_ERROR_CODE, reasons: [] }, CONFLICT);

    expect(readAccountRegistrationRejectionReasons(error)).toBeNull();
  });

  it('ignores an empty body', () => {
    expect(readAccountRegistrationRejectionReasons(rejection(null))).toBeNull();
  });

  it('ignores anything that is not an http error', () => {
    expect(readAccountRegistrationRejectionReasons(new Error('boom'))).toBeNull();
  });
});

describe('accountRegistrationReasonKey', () => {
  it.each(Object.values(ACCOUNT_REGISTRATION_REASONS))('maps the known code %s to its own text key', (code) => {
    expect(accountRegistrationReasonKey(code)).toBe(`accountRegistration.reason.${code}`);
  });

  it('falls back to the unknown-reason text for a code this client does not know', () => {
    expect(accountRegistrationReasonKey(UNKNOWN_CODE)).toBe(ACCOUNT_REGISTRATION_UNKNOWN_REASON_KEY);
  });
});

describe('accountRegistrationReasonKeys', () => {
  it('keeps the order and drops duplicate texts', () => {
    const keys = accountRegistrationReasonKeys([
      ACCOUNT_REGISTRATION_REASONS.PASSWORD_REQUIRES_DIGIT,
      UNKNOWN_CODE,
      'AnotherUnknownCode',
      ACCOUNT_REGISTRATION_REASONS.PASSWORD_REQUIRES_DIGIT,
    ]);

    expect(keys).toEqual([
      `accountRegistration.reason.${ACCOUNT_REGISTRATION_REASONS.PASSWORD_REQUIRES_DIGIT}`,
      ACCOUNT_REGISTRATION_UNKNOWN_REASON_KEY,
    ]);
  });
});

describe('accountRegistrationReasonTarget', () => {
  it.each([
    ACCOUNT_REGISTRATION_REASONS.PASSWORD_TOO_SHORT,
    ACCOUNT_REGISTRATION_REASONS.PASSWORD_REQUIRES_DIGIT,
    ACCOUNT_REGISTRATION_REASONS.PASSWORD_REQUIRES_NON_ALPHANUMERIC,
    ACCOUNT_REGISTRATION_REASONS.PASSWORD_REQUIRES_UPPER,
    ACCOUNT_REGISTRATION_REASONS.PASSWORD_REQUIRES_LOWER,
    ACCOUNT_REGISTRATION_REASONS.PASSWORD_REQUIRES_UNIQUE_CHARS,
  ])('assigns %s to the password field', (code) => {
    expect(accountRegistrationReasonTarget(code)).toBe(ACCOUNT_REGISTRATION_REASON_TARGET.PASSWORD);
  });

  it.each([ACCOUNT_REGISTRATION_REASONS.DUPLICATE_EMAIL, ACCOUNT_REGISTRATION_REASONS.INVALID_EMAIL])(
    'assigns %s to the email field',
    (code) => {
      expect(accountRegistrationReasonTarget(code)).toBe(ACCOUNT_REGISTRATION_REASON_TARGET.EMAIL);
    },
  );

  it.each([
    ACCOUNT_REGISTRATION_REASONS.DUPLICATE_USER_NAME,
    ACCOUNT_REGISTRATION_REASONS.INVALID_USER_NAME,
    UNKNOWN_CODE,
    'PasswordRequiresSomethingNew',
  ])('shows %s as a general error', (code) => {
    expect(accountRegistrationReasonTarget(code)).toBe(ACCOUNT_REGISTRATION_REASON_TARGET.GENERAL);
  });
});
