// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { BaseTruncated } from '../base-truncated-class';
import { ITruncatedAbsence } from './truncated-absence.interface';
import { Absence } from './absence-class';

export class TruncatedAbsence
  extends BaseTruncated
  implements ITruncatedAbsence
{
  absences: Absence[] = [];
}
