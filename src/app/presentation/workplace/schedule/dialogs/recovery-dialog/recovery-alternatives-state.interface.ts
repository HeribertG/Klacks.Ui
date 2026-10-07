// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IReplacementCandidate } from 'src/app/domain/interfaces/replacement-candidate.interface';
import { RecoveryAlternativesStatus } from './recovery-alternatives-status.enum';

export interface IRecoveryAlternativesState {
  status: RecoveryAlternativesStatus;
  candidates: IReplacementCandidate[];
}
