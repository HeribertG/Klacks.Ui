// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IUpdateLearnedCapabilityRequest {
  goal: string;
  synonyms?: Record<string, string[]>;
}
