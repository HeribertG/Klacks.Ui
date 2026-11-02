// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpErrorResponse } from '@angular/common/http';
import { readScenarioVariantConflictKey, readScenarioVariantRefusalKey } from './scenario-variant-refusal.model';

describe('readScenarioVariantRefusalKey', () => {
  it.each([
    ['SCENARIO_VARIANT_IN_USE', 'scenarioVariant.error.inUse'],
    ['SCENARIO_VARIANT_CONSUMED', 'scenarioVariant.error.consumed'],
    ['SCENARIO_VARIANT_SHIFT_CLONED', 'scenarioVariant.error.shiftCloned'],
    ['SCENARIO_VARIANT_SHIFT_HAS_CUTS', 'scenarioVariant.error.shiftHasCuts'],
    ['SCENARIO_VARIANT_SHIFTS_OUTSIDE_PERIOD', 'scenarioVariant.error.shiftsOutsidePeriod'],
  ])('explains the coded conflict %s by its own key, never by the English detail', (errorCode, key) => {
    // Arrange
    const error = new HttpErrorResponse({ status: 409, error: { detail: 'English text', errorCode } });

    // Act / Assert
    expect(readScenarioVariantRefusalKey(error)).toBe(key);
  });

  it.each([
    [400, 'scenarioVariant.error.invalid'],
    [404, 'scenarioVariant.error.gone'],
    [409, 'scenarioVariant.error.conflict'],
  ])('explains an uncoded %s by its status', (status, key) => {
    // Arrange
    const error = new HttpErrorResponse({ status, error: { detail: 'English text' } });

    // Act / Assert
    expect(readScenarioVariantRefusalKey(error)).toBe(key);
  });

  it('explains a body without detail like any other refusal', () => {
    // Arrange
    const error = new HttpErrorResponse({ status: 409, error: null });

    // Act / Assert
    expect(readScenarioVariantRefusalKey(error)).toBe('scenarioVariant.error.conflict');
  });

  it('returns null for a failure the interceptor already reported', () => {
    // Arrange
    const error = new HttpErrorResponse({ status: 500, error: { detail: 'boom' } });

    // Act / Assert
    expect(readScenarioVariantRefusalKey(error)).toBeNull();
  });

  it('returns null for anything that is not an HTTP error', () => {
    // Act / Assert
    expect(readScenarioVariantRefusalKey(new Error('offline'))).toBeNull();
  });
});

describe('readScenarioVariantConflictKey', () => {
  it('returns null for a foreign error code and for a body without one', () => {
    // Arrange
    const foreign = new HttpErrorResponse({ status: 409, error: { errorCode: 'SCENARIO_STALE' } });
    const uncoded = new HttpErrorResponse({ status: 409, error: 'plain' });

    // Act / Assert
    expect(readScenarioVariantConflictKey(foreign)).toBeNull();
    expect(readScenarioVariantConflictKey(uncoded)).toBeNull();
  });
});
