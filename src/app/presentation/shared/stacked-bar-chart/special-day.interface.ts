// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { SpecialDayType } from './special-day-type.type';

export interface ISpecialDay {
  index: number;
  type: SpecialDayType;
  color: string;
  tooltip?: string;
}
