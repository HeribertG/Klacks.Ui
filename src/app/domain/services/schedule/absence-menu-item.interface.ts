// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { AbsenceDetailMode } from 'src/app/domain/models/absence-detail/absence-detail-mode.enum';
import { IMultiLanguage } from 'src/app/domain/models/translation/multi-language.interface';

export interface AbsenceMenuItem {
  id: string;
  absenceId: string;
  absenceName: string;
  name: string;
  color: string;
  isDetail: boolean;
  startTime?: string;
  endTime?: string;
  duration?: number;
  mode?: AbsenceDetailMode;
  defaultValue: number;
  description?: IMultiLanguage;
}
