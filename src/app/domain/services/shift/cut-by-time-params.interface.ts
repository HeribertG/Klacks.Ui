// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Shift } from 'src/app/domain/models/shift/shift-class';
import { OwnTime } from 'src/app/domain/models/schedule/own-time-class';

export interface CutByTimeParams {
  selectedShift: Shift;
  cutTime: OwnTime;
}
