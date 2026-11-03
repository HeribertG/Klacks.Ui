// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { containerWorkChangeRefusalKey } from './container-work-change-refusal.helper';

describe('containerWorkChangeRefusalKey', () => {
  const failure = (status: number, errorCode?: string) =>
    new HttpErrorResponse({ status, url: '/api/backend/WorkChanges', error: errorCode ? { errorCode } : null });

  it.each([
    ['CONTAINER_CORRECTION_REFUSED', 'schedule.container-work-change.correction-refused'],
    ['CONTAINER_REPLACEMENT_REFUSED', 'schedule.container-work-change.replacement-refused'],
  ])('explains the code %s', (code, key) => {
    expect(containerWorkChangeRefusalKey(failure(HttpStatusCode.BadRequest, code))).toBe(key);
  });

  it('leaves another code, another status and a non-HTTP error to the generic handling', () => {
    expect(containerWorkChangeRefusalKey(failure(HttpStatusCode.BadRequest, 'MOVE_HELD'))).toBeNull();
    expect(containerWorkChangeRefusalKey(failure(HttpStatusCode.Conflict, 'CONTAINER_CORRECTION_REFUSED'))).toBeNull();
    expect(containerWorkChangeRefusalKey(new Error('x'))).toBeNull();
  });
});
