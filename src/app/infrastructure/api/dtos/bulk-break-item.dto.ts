// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
}
