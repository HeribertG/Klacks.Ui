// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IBaseFilter } from '../base-filter.interface';
import { Work } from './schedule-class';

export interface IWorkFilter extends IBaseFilter {
  currentMonth: number;
  currentYear: number;
  currentWeek?: number;
  paymentInterval: number;
  works: Work[];
  selectedGroup: string | undefined;
  showEmployees: boolean;
  showExtern: boolean;
  individualSort: boolean;
}
