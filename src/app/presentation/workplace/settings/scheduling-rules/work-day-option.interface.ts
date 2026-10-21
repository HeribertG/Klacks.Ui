// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { SchedulingRuleTriStateField } from './scheduling-rule-tri-state-field.type';

export interface WorkDayOption {
  readonly field: SchedulingRuleTriStateField;
  readonly labelKey: string;
}
