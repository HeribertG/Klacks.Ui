// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { readErrorCode, readRefusalCode } from './read-refusal-code.helper';

describe('readRefusalCode', () => {
  it('reads the code of a coded 400 by default', () => {
    expect(readRefusalCode(new HttpErrorResponse({ status: 400, error: { errorCode: 'A_CODE' } }))).toBe('A_CODE');
  });

  it('reads the code only for the given status', () => {
    const conflict = new HttpErrorResponse({ status: 409, error: { errorCode: 'A_CODE' } });
    expect(readRefusalCode(conflict, HttpStatusCode.Conflict)).toBe('A_CODE');
    expect(readRefusalCode(conflict)).toBeNull();
  });

  it('gives null without a string code or for another error', () => {
    expect(readRefusalCode(new HttpErrorResponse({ status: 400, error: null }))).toBeNull();
    expect(readRefusalCode(new HttpErrorResponse({ status: 400, error: { errorCode: 7 } }))).toBeNull();
    expect(readRefusalCode(new Error('A_CODE'))).toBeNull();
  });
});

describe('readErrorCode', () => {
  it('reads the code whatever the status', () => {
    expect(readErrorCode(new HttpErrorResponse({ status: 409, error: { errorCode: 'A_CODE' } }))).toBe('A_CODE');
    expect(readErrorCode(new HttpErrorResponse({ status: 500, error: {} }))).toBeNull();
    expect(readErrorCode('A_CODE')).toBeNull();
  });
});
