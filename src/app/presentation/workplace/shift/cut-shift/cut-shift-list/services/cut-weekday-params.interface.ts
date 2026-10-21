// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { CutWeekdaySelection } from './cut-weekday-selection.interface';

export interface CutWeekdayParams {
  weekdays: CutWeekdaySelection;
  isMondayEnabled: boolean;
  isTuesdayEnabled: boolean;
  isWednesdayEnabled: boolean;
  isThursdayEnabled: boolean;
  isFridayEnabled: boolean;
  isSaturdayEnabled: boolean;
  isSundayEnabled: boolean;
}
