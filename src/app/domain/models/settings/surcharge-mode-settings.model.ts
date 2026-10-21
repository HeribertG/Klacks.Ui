// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ISurchargeModeSettings } from './surcharge-mode-settings.interface';
import { SurchargeRateMode } from './surcharge-rate-mode.type';
import { SurchargeStackingMode } from './surcharge-stacking-mode.type';

export class SurchargeModeSettings implements ISurchargeModeSettings {
  we3Rate = 0;
  nightRateMode: SurchargeRateMode = 'multiplier';
  holidayRateMode: SurchargeRateMode = 'multiplier';
  we1RateMode: SurchargeRateMode = 'multiplier';
  we2RateMode: SurchargeRateMode = 'multiplier';
  we3RateMode: SurchargeRateMode = 'multiplier';
  nightMinimumPerHour: number | null = null;
  holidayMinimumPerHour: number | null = null;
  we1MinimumPerHour: number | null = null;
  we2MinimumPerHour: number | null = null;
  we3MinimumPerHour: number | null = null;
  nightStart = '23:00';
  nightEnd = '06:00';
  stackingMode: SurchargeStackingMode = 'highestwins';
}
