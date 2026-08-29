// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { HttpErrorResponse } from '@angular/common/http';
import { describe, it, expect } from 'vitest';
import { SETUP_REQUIRED_ERROR_CODE, isSetupRequiredError } from './setup-required.model';

describe('isSetupRequiredError', () => {
  const forbidden = (body: unknown): HttpErrorResponse =>
    new HttpErrorResponse({ status: 403, error: body });

  it('should recognise the setup-required block', () => {
    expect(isSetupRequiredError(forbidden({ errorCode: SETUP_REQUIRED_ERROR_CODE }))).toBe(true);
  });

  it('should ignore a different 403 error code', () => {
    expect(isSetupRequiredError(forbidden({ errorCode: 'SOME_OTHER_CODE' }))).toBe(false);
  });

  it('should ignore a non-403 response', () => {
    const error = new HttpErrorResponse({
      status: 401,
      error: { errorCode: SETUP_REQUIRED_ERROR_CODE },
    });

    expect(isSetupRequiredError(error)).toBe(false);
  });

  it('should ignore an empty body', () => {
    expect(isSetupRequiredError(forbidden(null))).toBe(false);
  });

  it('should ignore anything that is not an http error', () => {
    expect(isSetupRequiredError(new Error('boom'))).toBe(false);
  });
});
