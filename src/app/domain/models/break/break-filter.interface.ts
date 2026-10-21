// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IBaseFilter } from '../base-filter.interface';
import { AbsenceTokenFilter } from './absence-token-filter-class';

export interface IBreakFilter extends IBaseFilter {
  currentYear: number;
  absences: AbsenceTokenFilter[];
  selectedGroup: string | undefined;
  startRow?: number;
  rowCount?: number;
  showEmployees: boolean;
  showExtern: boolean;
  individualSort: boolean;
  startDate?: string;
  endDate?: string;
}
