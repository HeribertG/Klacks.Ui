// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { WizardTrainingOverrides } from './wizard-training-overrides.interface';

export interface WizardRequest {
  periodFrom: string;
  periodUntil: string;
  agentIds: string[];
  shiftIds?: string[] | null;
  analyseToken?: string | null;
  trainingOverrides?: WizardTrainingOverrides | null;
  agentOrderIsUserDefined?: boolean;
}
