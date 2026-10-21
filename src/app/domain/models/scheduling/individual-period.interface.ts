// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IPeriod } from './period.interface';

export interface IIndividualPeriod {
  id?: string;
  name: string;
  periods: IPeriod[];
}
