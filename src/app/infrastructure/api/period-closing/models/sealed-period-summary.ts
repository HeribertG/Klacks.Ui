// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface SealedPeriodSummary {
  date: string;
  totalWorkCount: number;
  sealedWorkCount: number;
  totalBreakCount: number;
  sealedBreakCount: number;
  isFullySealed: boolean;
  isDaySealed: boolean;
}
