// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { HttpErrorResponse } from '@angular/common/http';
import { describe, it, expect } from 'vitest';
import {
  AUTOFILL_RUN_CONFLICT_ERROR_CODE,
  readAutofillRunConflict,
} from './autofill-run-conflict.model';

describe('readAutofillRunConflict', () => {
  const conflict = (body: unknown): HttpErrorResponse =>
    new HttpErrorResponse({ status: 409, error: body });

  it('should return the running job id for a run conflict', () => {
    // Arrange
    const runningJobId = '11111111-2222-3333-4444-555555555555';
    const error = conflict({ errorCode: AUTOFILL_RUN_CONFLICT_ERROR_CODE, runningJobId });

    // Act
    const result = readAutofillRunConflict(error);

    // Assert
    expect(result).toEqual({ runningJobId });
  });

  it('should ignore a 409 that is a different conflict', () => {
    // The apply path answers 409 too; mistaking a stale result for a run conflict would tell the
    // planner to wait for a job that does not exist.
    expect(readAutofillRunConflict(conflict({ errorCode: 'staleWizardResult' }))).toBeNull();
  });

  it('should ignore a non-409 response', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { errorCode: AUTOFILL_RUN_CONFLICT_ERROR_CODE, runningJobId: 'x' },
    });

    expect(readAutofillRunConflict(error)).toBeNull();
  });

  it('should ignore a conflict without a job id', () => {
    expect(readAutofillRunConflict(conflict({ errorCode: AUTOFILL_RUN_CONFLICT_ERROR_CODE }))).toBeNull();
  });

  it('should ignore an empty body', () => {
    expect(readAutofillRunConflict(conflict(null))).toBeNull();
  });

  it('should ignore anything that is not an http error', () => {
    expect(readAutofillRunConflict(new Error('boom'))).toBeNull();
  });
});
