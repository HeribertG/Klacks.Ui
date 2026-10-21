// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IBaseTruncated } from '../base-truncated.interface';
import { Absence } from './absence-class';

export interface ITruncatedAbsence extends IBaseTruncated {
  absences: Absence[];
}
