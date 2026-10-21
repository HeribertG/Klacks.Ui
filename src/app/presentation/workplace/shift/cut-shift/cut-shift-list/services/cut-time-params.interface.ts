// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { OwnTime } from 'src/app/domain/models/schedule/own-time-class';

export interface CutTimeParams {
  cutTimeShift: OwnTime;
  minTimeShift: OwnTime | null;
  maxTimeShift: OwnTime | null;
  isOverMidnight: boolean;
  is24Hours: boolean;
}
