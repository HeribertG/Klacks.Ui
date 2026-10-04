// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Null-preserving conversion of the five contract surcharge rates between the stored time-credit
 * factor (0.1) and the percent shown in the UI (10). Null means "standard" (scheduling rule, then
 * installation settings) and must never turn into 0; an explicit 0 stays 0.
 * @param contract - Contract whose nightRate, holidayRate and we1Rate..we3Rate are converted in place
 * @param convert - Conversion applied to every rate that is not null
 * @param value - Raw value of a rate input; empty, non-numeric or missing input means "standard"
 */

import { IContract } from 'src/app/domain/models/contract/contract-class';

const PERCENTAGE_FACTOR = 100;

type ContractRateKey = 'nightRate' | 'holidayRate' | 'we1Rate' | 'we2Rate' | 'we3Rate';

export const CONTRACT_RATE_KEYS: readonly ContractRateKey[] = [
  'nightRate',
  'holidayRate',
  'we1Rate',
  'we2Rate',
  'we3Rate',
];

export const factorToPercent = (value: number): number => value * PERCENTAGE_FACTOR;

export const percentToFactor = (value: number): number => value / PERCENTAGE_FACTOR;

export function convertContractRates(contract: IContract, convert: (value: number) => number): void {
  for (const key of CONTRACT_RATE_KEYS) {
    const value = contract[key];
    contract[key] = value == null ? null : convert(value);
  }
}

export function normalizeRateInput(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
