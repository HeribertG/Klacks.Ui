// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IAbsenceTokenFilter } from './absence-token-filter.interface';

export class AbsenceTokenFilter implements IAbsenceTokenFilter {
  id = '';
  name = '';
  checked = true;
}
