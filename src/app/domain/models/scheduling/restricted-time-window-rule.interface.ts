// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IRestrictedTimeWindowRule {
  id: string;
  seasonFromMonth: number;
  seasonFromDay: number;
  seasonToMonth: number;
  seasonToDay: number;
  dailyStart: string;
  dailyEnd: string;
  appliesToGroupTag: string;
}
