// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { BaseTruncated } from '../base-truncated-class';
import { ITruncatedShift } from './truncated-shift.interface';
import { IShift } from './shift.interface';

export class TruncatedShift extends BaseTruncated implements ITruncatedShift {
  shifts: IShift[] = [];
}
