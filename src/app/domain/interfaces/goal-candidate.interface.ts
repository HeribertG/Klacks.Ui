// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IGoalCandidate {
  id: string;
  goalType: string | null;
  titleKey: string | null;
  rationaleKey: string | null;
  rationaleParams: Record<string, string> | null;
  title: string;
  rationale: string;
  confidence: string;
  signalSource: string;
  status: string;
  createdUtc: string | null;
  decidedUtc: string | null;
}
