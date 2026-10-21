// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IBaseFilter } from '../base-filter.interface';

export interface IAbsenceFilter extends IBaseFilter {
  language: string | undefined;
}
