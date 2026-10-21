// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IIndividualPeriod } from './individual-period.interface';
import { IPeriod } from './period.interface';

export class IndividualPeriod implements IIndividualPeriod {
  id?: string = undefined;
  name = '';
  periods: IPeriod[] = [];
}
