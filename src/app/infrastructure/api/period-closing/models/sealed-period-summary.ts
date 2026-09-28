// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface SealedPeriodSummary {
  date: string;
  totalWorkCount: number;
  sealedWorkCount: number;
  totalBreakCount: number;
  sealedBreakCount: number;
  isFullySealed: boolean;
  isDaySealed: boolean;
}
