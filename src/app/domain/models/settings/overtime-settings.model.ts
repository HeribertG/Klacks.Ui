// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IOvertimeSettings } from './overtime-settings.interface';
import { OvertimeBasis } from './overtime-basis.type';
import { OvertimeRateMode } from './overtime-rate-mode.type';

export class OvertimeSettings implements IOvertimeSettings {
  overtimeBasis: OvertimeBasis = 'day';
  overtimeRateMode: OvertimeRateMode = 'multiplier';
  overtimeTier1AfterHours: number | null = null;
  overtimeTier1Rate: number | null = null;
  overtimeTier2AfterHours: number | null = null;
  overtimeTier2Rate: number | null = null;
  overtimeTier3AfterHours: number | null = null;
  overtimeTier3Rate: number | null = null;
}
