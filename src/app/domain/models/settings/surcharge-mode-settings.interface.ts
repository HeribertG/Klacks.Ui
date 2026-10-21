// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { SurchargeRateMode } from './surcharge-rate-mode.type';
import { SurchargeStackingMode } from './surcharge-stacking-mode.type';

export interface ISurchargeModeSettings {
  we3Rate: number;
  nightRateMode: SurchargeRateMode;
  holidayRateMode: SurchargeRateMode;
  we1RateMode: SurchargeRateMode;
  we2RateMode: SurchargeRateMode;
  we3RateMode: SurchargeRateMode;
  nightMinimumPerHour: number | null;
  holidayMinimumPerHour: number | null;
  we1MinimumPerHour: number | null;
  we2MinimumPerHour: number | null;
  we3MinimumPerHour: number | null;
  nightStart: string;
  nightEnd: string;
  stackingMode: SurchargeStackingMode;
}
