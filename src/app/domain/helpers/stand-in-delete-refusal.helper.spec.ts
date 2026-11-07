// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpErrorResponse } from '@angular/common/http';
import { STAND_IN_DELETE_REFUSAL_TOAST_NAME, standInDeleteRefusalToast } from './stand-in-delete-refusal.helper';
import { codedRefusalToast } from './coded-refusal-toast.helper';

const refusal = (status: number, error: object | null) => new HttpErrorResponse({ status, error });

describe('standInDeleteRefusalToast', () => {
  const body = { errorCode: 'STAND_IN_HAS_WORKS', standInName: 'Messe 1', workCount: 4, detail: 'English text' };

  it('explains the refused delete with the name and the number of services', () => {
    expect(standInDeleteRefusalToast(refusal(409, body))).toEqual({
      key: 'address.delete.standInHasWorks',
      name: STAND_IN_DELETE_REFUSAL_TOAST_NAME,
      params: { name: 'Messe 1', count: 4 },
    });
  });

  it('leaves another conflict and the same code on another status alone', () => {
    expect(standInDeleteRefusalToast(refusal(409, { errorCode: 'PERIOD_STAND_IN_WORKS' }))).toBeNull();
    expect(standInDeleteRefusalToast(refusal(400, body))).toBeNull();
    expect(standInDeleteRefusalToast(refusal(409, null))).toBeNull();
  });

  it('is shown by the interceptor as one translated toast with its parameters', () => {
    expect(codedRefusalToast(refusal(409, body))).toEqual(standInDeleteRefusalToast(refusal(409, body)));
  });
});
