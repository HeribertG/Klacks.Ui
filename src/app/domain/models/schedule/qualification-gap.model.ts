// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { QualificationGapKind } from './qualification-gap-kind.enum';
import { QualificationGapReason } from './qualification-gap-reason.enum';
import { QualificationGapSeverity } from './qualification-gap-severity.enum';
import { IMultiLanguage } from 'src/app/domain/models/translation/multi-language.interface';

export interface QualificationGapDetail {
  kind: QualificationGapKind;
  shiftId: string;
  shiftName: string;
  date: string;
  qualificationId: string;
  qualificationName: IMultiLanguage;
  qualificationEmoji: string | null;
  reason: QualificationGapReason;
  requiredMinLevel: number;
  severity: QualificationGapSeverity;
  agentId?: string | null;
  agentName?: string | null;
}
