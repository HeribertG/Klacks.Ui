// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpErrorResponse } from '@angular/common/http';
import { isShiftEndDateRefusal } from './shift-end-date-refusal.helper';

describe('isShiftEndDateRefusal', () => {
  it('recognises the coded 409', () => {
    expect(isShiftEndDateRefusal(new HttpErrorResponse({ status: 409, error: { errorCode: 'SHIFT_END_DATE_REFUSED' } }))).toBe(true);
  });

  it('leaves another 409 and the same code on another status alone', () => {
    expect(isShiftEndDateRefusal(new HttpErrorResponse({ status: 409, error: { errorCode: 'SHIFT_LOCKED' } }))).toBe(false);
    expect(isShiftEndDateRefusal(new HttpErrorResponse({ status: 400, error: { errorCode: 'SHIFT_END_DATE_REFUSED' } }))).toBe(false);
  });

  it('copes with an empty body', () => {
    expect(isShiftEndDateRefusal(new HttpErrorResponse({ status: 409, error: null }))).toBe(false);
  });
});
