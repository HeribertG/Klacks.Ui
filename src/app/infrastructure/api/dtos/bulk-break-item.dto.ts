// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { MultiLanguage } from 'src/app/domain/models/translation/multi-language-class';

export interface BulkAddBreakItem {
  clientId: string;
  absenceId: string;
  currentDate: string;
  workTime: number;
  startTime: string;
  endTime: string;
  information?: string;
  description?: MultiLanguage;
  analyseToken?: string;
}
