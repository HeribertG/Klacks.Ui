// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HolisticHarmonizerSwapDto } from './holistic-harmonizer-swap-dto.interface';

export interface HolisticHarmonizerRejectionDto {
  swap: HolisticHarmonizerSwapDto;
  reason: string;
  detail: string;
}
