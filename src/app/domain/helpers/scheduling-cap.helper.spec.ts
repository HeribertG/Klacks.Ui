// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { isSchedulingCapValid, raiseSchedulingCap, schedulingCapOr } from './scheduling-cap.helper';

describe('isSchedulingCapValid', () => {
  it('accepts empty and values of at least 1', () => {
    expect(isSchedulingCapValid(null)).toBe(true);
    expect(isSchedulingCapValid(undefined)).toBe(true);
    expect(isSchedulingCapValid(1)).toBe(true);
    expect(isSchedulingCapValid(10.5)).toBe(true);
  });

  it('rejects 0, values below 1 and NaN', () => {
    expect(isSchedulingCapValid(0)).toBe(false);
    expect(isSchedulingCapValid(0.5)).toBe(false);
    expect(isSchedulingCapValid(-1)).toBe(false);
    expect(isSchedulingCapValid(Number.NaN)).toBe(false);
  });
});

describe('raiseSchedulingCap', () => {
  it('raises 0 and values below 1 to 1', () => {
    expect(raiseSchedulingCap(0)).toBe(1);
    expect(raiseSchedulingCap(0.5)).toBe(1);
  });

  it('leaves an emptied field empty so typing a new value does not start from 1', () => {
    expect(raiseSchedulingCap(null)).toBeNull();
  });

  it('keeps values of at least 1', () => {
    expect(raiseSchedulingCap(1)).toBe(1);
    expect(raiseSchedulingCap(48)).toBe(48);
  });
});

describe('schedulingCapOr', () => {
  it('keeps a valid cap', () => {
    expect(schedulingCapOr(9, 10)).toBe(9);
  });

  it('keeps the fallback for empty, NaN or a cap below 1', () => {
    expect(schedulingCapOr(null, 10)).toBe(10);
    expect(schedulingCapOr(Number.NaN, 10)).toBe(10);
    expect(schedulingCapOr(0, 10)).toBe(10);
  });
});
