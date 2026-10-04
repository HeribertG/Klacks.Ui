// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import { Contract } from 'src/app/domain/models/contract/contract-class';
import {
  convertContractRates,
  factorToPercent,
  normalizeRateInput,
  percentToFactor,
} from './contract-rate.helper';

describe('contract-rate.helper', () => {
  it('keeps null rates null and explicit zero at zero in both directions', () => {
    const contract = new Contract();
    contract.nightRate = null;
    contract.holidayRate = 0;
    contract.we1Rate = 0.25;
    contract.we2Rate = null;
    contract.we3Rate = 0;

    convertContractRates(contract, factorToPercent);

    expect(contract.nightRate).toBeNull();
    expect(contract.holidayRate).toBe(0);
    expect(contract.we1Rate).toBe(25);
    expect(contract.we2Rate).toBeNull();
    expect(contract.we3Rate).toBe(0);

    convertContractRates(contract, percentToFactor);

    expect(contract.nightRate).toBeNull();
    expect(contract.holidayRate).toBe(0);
    expect(contract.we1Rate).toBe(0.25);
  });

  it('a new contract starts with every rate and the shift-work flag on standard', () => {
    const contract = new Contract();

    expect(contract.nightRate).toBeNull();
    expect(contract.holidayRate).toBeNull();
    expect(contract.we1Rate).toBeNull();
    expect(contract.we2Rate).toBeNull();
    expect(contract.we3Rate).toBeNull();
    expect(contract.performsShiftWork).toBeNull();
  });

  it.each([
    [null, null],
    [undefined, null],
    ['', null],
    ['abc', null],
    [Number.NaN, null],
    [0, 0],
    ['0', 0],
    [12.5, 12.5],
  ])('normalizeRateInput(%s) -> %s', (input, expected) => {
    expect(normalizeRateInput(input)).toBe(expected);
  });
});
