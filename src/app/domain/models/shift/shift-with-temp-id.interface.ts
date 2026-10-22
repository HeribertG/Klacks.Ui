// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Shift } from 'src/app/domain/models/shift/shift-class';

export interface ShiftWithTempId extends Shift {
  __tempId?: string;
}
