// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ILearnedCapabilityStep } from './learned-capability-step.interface';

export interface ILearnedCapability {
  id: string;
  name: string;
  goal: string;
  steps: ILearnedCapabilityStep[];
  learnedAt: string;
  quote: number | null;
  uses: number | null;
  needsFirstUse: boolean;
}
