// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Shift } from 'src/app/domain/models/shift/shift-class';

export interface CutByWeekdaysParams {
  selectedShift: Shift;
  weekdays: {
    isMonday: boolean;
    isTuesday: boolean;
    isWednesday: boolean;
    isThursday: boolean;
    isFriday: boolean;
    isSaturday: boolean;
    isSunday: boolean;
  };
}
