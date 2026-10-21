// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface NavigationFeedbackDto {
  id: string;
  utterance: string;
  locale: string;
  matchedTargetId?: string;
  timestamp: string;
}
