// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IMultiLanguage } from 'src/app/domain/models/translation/multi-language-class';

export enum QualificationGapKind {
  UnfillableSlot = 0,
  AssignedUnqualified = 1,
}

export enum QualificationGapReason {
  Missing = 0,
  Expired = 1,
  InsufficientLevel = 2,
}

export enum QualificationGapSeverity {
  Error = 0,
  Warning = 1,
}

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
