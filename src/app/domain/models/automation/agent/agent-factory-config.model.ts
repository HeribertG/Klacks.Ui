// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IAgentFactoryConfig {
  maxConsecutiveDays?: number;
  minRestDays?: number;
  minRestHours?: number;
  maxDailyHours?: number;
  maxWeeklyHours?: number;
  maxOptimalGap?: number;
}
