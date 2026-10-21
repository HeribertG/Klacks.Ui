// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { OvertimeBasis } from 'src/app/domain/models/settings/overtime-basis.type';
import { OvertimeRateMode } from 'src/app/domain/models/settings/overtime-rate-mode.type';

export interface OvertimeSettingsFormModel {
  overtimeBasis: OvertimeBasis;
  overtimeRateMode: OvertimeRateMode;
  overtimeTier1AfterHours: number | null;
  overtimeTier1Rate: number | null;
  overtimeTier2AfterHours: number | null;
  overtimeTier2Rate: number | null;
  overtimeTier3AfterHours: number | null;
  overtimeTier3Rate: number | null;
}
