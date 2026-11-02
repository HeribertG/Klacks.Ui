// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpErrorResponse } from '@angular/common/http';
import { isShiftResetRefusal } from './shift-reset-refusal.helper';

describe('isShiftResetRefusal', () => {
  it('recognises the coded conflict', () => {
    expect(isShiftResetRefusal(new HttpErrorResponse({ status: 409, error: { errorCode: 'SHIFT_RESET_REFUSED' } }))).toBe(true);
  });

  it('ignores another conflict and another status', () => {
    expect(isShiftResetRefusal(new HttpErrorResponse({ status: 409, error: { errorCode: 'SHIFT_END_DATE_REFUSED' } }))).toBe(false);
    expect(isShiftResetRefusal(new HttpErrorResponse({ status: 400, error: { errorCode: 'SHIFT_RESET_REFUSED' } }))).toBe(false);
    expect(isShiftResetRefusal(new Error('SHIFT_RESET_REFUSED'))).toBe(false);
  });
});
