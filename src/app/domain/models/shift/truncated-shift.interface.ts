// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IBaseTruncated } from '../base-truncated.interface';
import { IShift } from './shift.interface';

export interface ITruncatedShift extends IBaseTruncated {
  shifts: IShift[];
}
