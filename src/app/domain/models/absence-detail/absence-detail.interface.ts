// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { AbsenceDetailMode } from './absence-detail-mode.enum';
import { MultiLanguage } from '../translation/multi-language-class';

export interface IAbsenceDetail {
  id: string | undefined;
  absenceId: string;
  mode: AbsenceDetailMode;
  startTime: string;
  endTime: string;
  duration: number;
  detailName?: MultiLanguage | undefined;
  description?: MultiLanguage | undefined;
}
