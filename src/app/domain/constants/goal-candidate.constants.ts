// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Status, confidence and decision values for Klacksy's self-proposed goal candidates. The confidence
 * values are lower case because that is exactly how the server stores and sends them — comparing
 * against capitalized variants silently degraded every candidate to "unknown" in the panel.
 */
export const GOAL_CANDIDATE_STATUS = {
  Proposed: 'proposed',
  Approved: 'approved',
  Rejected: 'rejected',
} as const;

export type GoalCandidateStatus = (typeof GOAL_CANDIDATE_STATUS)[keyof typeof GOAL_CANDIDATE_STATUS];

export const GOAL_CANDIDATE_CONFIDENCE = {
  High: 'high',
  Low: 'low',
  Unknown: 'unknown',
} as const;

export type GoalCandidateConfidence = (typeof GOAL_CANDIDATE_CONFIDENCE)[keyof typeof GOAL_CANDIDATE_CONFIDENCE];

export const GOAL_CANDIDATE_DECISION = {
  Approved: 'approved',
  Rejected: 'rejected',
} as const;

export type GoalCandidateDecision = (typeof GOAL_CANDIDATE_DECISION)[keyof typeof GOAL_CANDIDATE_DECISION];
