// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IAbsenceDetail } from './absence-detail.interface';
import { AbsenceDetailMode } from './absence-detail-mode.enum';
import { MultiLanguage } from '../translation/multi-language-class';

export class AbsenceDetail implements IAbsenceDetail {
  id: string | undefined = undefined;
  absenceId = '';
  mode: AbsenceDetailMode = AbsenceDetailMode.TimeRange;
  startTime = '00:00:00';
  endTime = '23:59:00';
  duration = 0;
  detailName?: MultiLanguage | undefined = undefined;
  description?: MultiLanguage | undefined = undefined;
}
