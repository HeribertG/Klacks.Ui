// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { GoalCandidateDecision } from 'src/app/domain/constants/goal-candidate.constants';

export interface ISetGoalCandidateDecisionRequest {
  decision: GoalCandidateDecision;
}
