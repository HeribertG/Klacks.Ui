// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IExcludedCandidate } from './excluded-replacement-candidate.interface';
import { IReplacementCandidate } from './replacement-candidate.interface';

export interface IReplacementCandidatesResult {
  eligible: IReplacementCandidate[];
  excluded: IExcludedCandidate[];
}
