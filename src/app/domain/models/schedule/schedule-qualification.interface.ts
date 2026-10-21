// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IMultiLanguage } from 'src/app/domain/models/translation/multi-language.interface';

export interface IScheduleQualification {
  qualificationId: string;
  emoji: string | null;
  name: IMultiLanguage;
  level: number;
  validUntil?: string | null;
}
