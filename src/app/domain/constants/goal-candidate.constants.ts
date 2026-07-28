// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Status, confidence and decision values for Klacksy's self-proposed goal candidates
 * (Phase 2: proposing a goal only changes its status, nothing is planned or executed).
 */
export const GOAL_CANDIDATE_STATUS = {
  Proposed: 'proposed',
  Approved: 'approved',
  Rejected: 'rejected',
} as const;

export type GoalCandidateStatus = (typeof GOAL_CANDIDATE_STATUS)[keyof typeof GOAL_CANDIDATE_STATUS];

export const GOAL_CANDIDATE_CONFIDENCE = {
  High: 'High',
  Low: 'Low',
  Unknown: 'Unknown',
} as const;

export type GoalCandidateConfidence = (typeof GOAL_CANDIDATE_CONFIDENCE)[keyof typeof GOAL_CANDIDATE_CONFIDENCE];

export const GOAL_CANDIDATE_DECISION = {
  Approved: 'approved',
  Rejected: 'rejected',
} as const;

export type GoalCandidateDecision = (typeof GOAL_CANDIDATE_DECISION)[keyof typeof GOAL_CANDIDATE_DECISION];
