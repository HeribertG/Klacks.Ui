// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Parameters a report asks for when it is executed.
 * Their values are available to row filters and formulas, and can optionally be bound
 * to one of the query arguments the data providers already accept.
 * @param key - Identifier, exposed to scripts as param_<key>
 * @param bindsTo - Query argument the value is passed to, if any
 */

import { ReportParameterType } from './report-parameter-type.enum';
import { ReportParameterBinding } from './report-parameter-binding.enum';

export interface ReportParameter {
  key: string;
  label: string;
  type: ReportParameterType;
  required?: boolean;
  defaultValue?: string;
  choices?: string[];
  bindsTo?: ReportParameterBinding;
}
