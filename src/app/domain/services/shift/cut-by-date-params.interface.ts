// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Shift } from 'src/app/domain/models/shift/shift-class';

export interface CutByDateParams {
  selectedShift: Shift;
  cutDate: Date;
}
