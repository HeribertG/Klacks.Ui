// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpErrorResponse } from '@angular/common/http';
import { CONTAINER_REFUSAL_TOAST_NAME, containerRefusalKey } from './container-refusal.helper';
import { codedRefusalToast } from './coded-refusal-toast.helper';

const refusal = (status: number, errorCode: unknown) => new HttpErrorResponse({ status, error: { errorCode } });

describe('containerRefusalKey', () => {
  it('explains a container or template that does not hold its services', () => {
    expect(containerRefusalKey(refusal(400, 'CONTAINER_ITEM_OUTSIDE'))).toBe('schedule.container-fit.outside');
  });

  it('explains an expense on a service inside a container', () => {
    expect(containerRefusalKey(refusal(400, 'EXPENSE_ON_CONTAINER_SERVICE'))).toBe('schedule.container-expense.refused');
  });

  it('explains confirming a service inside a container on its own', () => {
    expect(containerRefusalKey(refusal(400, 'CONTAINER_CHILD_CONFIRM_REFUSED'))).toBe(
      'schedule.container-child.confirm-refused',
    );
  });

  it('leaves another 400 and the same code on another status alone', () => {
    expect(containerRefusalKey(refusal(400, 'DAY_SEALED'))).toBeNull();
    expect(containerRefusalKey(refusal(409, 'CONTAINER_ITEM_OUTSIDE'))).toBeNull();
  });

  it('copes with an empty body', () => {
    expect(containerRefusalKey(new HttpErrorResponse({ status: 400, error: null }))).toBeNull();
  });

  it('is shown by the interceptor as one translated toast', () => {
    expect(codedRefusalToast(refusal(400, 'CONTAINER_ITEM_OUTSIDE'))).toEqual({
      key: 'schedule.container-fit.outside',
      name: CONTAINER_REFUSAL_TOAST_NAME,
    });
  });
});
