// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface HarmonizerRowResult {
  agentId: string;
  scoreBefore: number;
  scoreAfter: number;
  emergencyUnlockTriggered: boolean;
}
