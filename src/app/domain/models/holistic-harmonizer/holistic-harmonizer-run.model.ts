// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Domain models for Holistic Harmonizer (LLM-driven schedule harmonizer).
 * Mirror the DTOs returned by /api/backend/HolisticHarmonizer/Start (REST kick-off),
 * the SignalR completion payload (/hubs/holistic-harmonizer OnCompleted), and /ApplyAsScenario.
 */

export interface HolisticHarmonizerRunRequest {
  periodFrom: string;
  periodUntil: string;
  agentIds: string[];
  analyseToken: string | null;
  language: string | null;
}

export type HolisticHarmonizerStatus = 'idle' | 'running' | 'completed' | 'cancelled' | 'failed';
