// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HolisticHarmonizerSwapDto } from './holistic-harmonizer-swap-dto.interface';
import { HolisticHarmonizerRejectionDto } from './holistic-harmonizer-rejection-dto.interface';

export interface HolisticHarmonizerBatchDto {
  batchId: string;
  intent: string;
  result: string;
  appliedStepCount: number;
  rejectionCount: number;
  stoppedAtStep: number | null;
  scoreBefore: number;
  scoreAfter: number;
  appliedSwaps: HolisticHarmonizerSwapDto[];
  rejections: HolisticHarmonizerRejectionDto[];
}
