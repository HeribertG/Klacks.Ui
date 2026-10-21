// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface CoreAgent {
  id: string;
  currentHours: number;
  guaranteedHours: number;
  maxConsecutiveDays: number;
  minRestHours: number;
  motivation: number;
  maxDailyHours: number;
  maxWeeklyHours: number;
  maxOptimalGap: number;
}
