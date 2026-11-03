// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { moveReversalRefusalKey, MOVE_REVERSAL_NOT_FOUND_KEY } from './move-reversal-refusal.helper';

const URL = '/api/backend/Recovery/Works/work-1/ReverseMove';

function failure(status: number, errorCode?: string, url = URL): HttpErrorResponse {
  return new HttpErrorResponse({ status, url, error: errorCode ? { errorCode } : null });
}

describe('moveReversalRefusalKey', () => {
  it.each([
    ['MOVE_ALREADY_BACK', 'schedule.move-reversal.already-back'],
    ['MOVE_MOVED_ON', 'schedule.move-reversal.moved-on'],
    ['MOVE_HELD', 'schedule.move-reversal.held'],
    ['MOVE_NOT_APPLIED', 'schedule.move-reversal.not-applied'],
    ['MOVE_ALREADY_REVERSED', 'schedule.move-reversal.already-reversed'],
    ['MOVE_ORIGIN_BUSY', 'schedule.move-reversal.origin-busy'],
  ])('explains the code %s', (code, key) => {
    expect(moveReversalRefusalKey(failure(HttpStatusCode.BadRequest, code))).toBe(key);
  });

  it('explains a missing or hidden service', () => {
    expect(moveReversalRefusalKey(failure(HttpStatusCode.NotFound))).toBe(MOVE_REVERSAL_NOT_FOUND_KEY);
  });

  it('leaves an unknown code to the generic handling', () => {
    expect(moveReversalRefusalKey(failure(HttpStatusCode.BadRequest, 'DAY_SEALED'))).toBeNull();
  });

  it('leaves every other endpoint alone', () => {
    expect(moveReversalRefusalKey(failure(HttpStatusCode.NotFound, undefined, '/api/backend/Works/1'))).toBeNull();
  });
});
