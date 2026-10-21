// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { WizardTokenResult } from './wizard-token-result.interface';
import { WizardAuctionAward } from './wizard-auction-award.interface';
import { WizardEscalation } from './wizard-escalation.interface';
import { QualificationGapDetail } from 'src/app/domain/models/schedule/qualification-gap.model';

export interface WizardResult {
  jobId: string;
  finalHardViolations: number;
  finalStage1Completion: number;
  tokenCount: number;
  availableShiftSlots: number;
  tokens: WizardTokenResult[];
  awards?: WizardAuctionAward[];
  escalations?: WizardEscalation[];
  qualificationGaps?: QualificationGapDetail[];
}
