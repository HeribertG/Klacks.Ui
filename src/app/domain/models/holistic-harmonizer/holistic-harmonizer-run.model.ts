// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Domain models for Holistic Harmonizer (deterministic stage-3 schedule harmonizer).
 * Mirror the DTOs returned by /api/backend/HolisticHarmonizer/Start (REST kick-off),
 * the SignalR completion payload (/hubs/holistic-harmonizer OnCompleted), and /ApplyAsScenario.
 */

export interface HolisticHarmonizerRunRequest {
  periodFrom: string;
  periodUntil: string;
  agentIds: string[];
  analyseToken: string | null;
  agentOrderIsUserDefined: boolean;
}
