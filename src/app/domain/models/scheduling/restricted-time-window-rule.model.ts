// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IRestrictedTimeWindowRule } from './restricted-time-window-rule.interface';

export class RestrictedTimeWindowRule implements IRestrictedTimeWindowRule {
  id = '';
  seasonFromMonth = 1;
  seasonFromDay = 1;
  seasonToMonth = 12;
  seasonToDay = 31;
  dailyStart = '22:00';
  dailyEnd = '06:00';
  appliesToGroupTag = '';
}
