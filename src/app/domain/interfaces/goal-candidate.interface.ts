// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IGoalCandidate {
  id: string;
  title: string;
  rationale: string;
  confidence: string;
  signalSource: string;
  status: string;
  createdUtc: string | null;
  decidedUtc: string | null;
}
