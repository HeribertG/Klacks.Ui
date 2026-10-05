// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Reason codes the backend reports for slots a scenario leaves open, and the translation key prefix of their texts.
 */
export const SCENARIO_OPEN_SLOT_REASON = {
  NO_AGENT_IN_SCOPE: 'NO_AGENT_IN_SCOPE',
  NO_ACTIVE_CONTRACT: 'NO_ACTIVE_CONTRACT',
  NO_AGENT_WORKS_ON_WEEKDAY: 'NO_AGENT_WORKS_ON_WEEKDAY',
  NO_AGENT_PERFORMS_SHIFT_WORK: 'NO_AGENT_PERFORMS_SHIFT_WORK',
  CAPACITY_OR_RULES: 'CAPACITY_OR_RULES',
} as const;

export const SCENARIO_OPEN_SLOT_REASON_KEY_PREFIX = 'scenarioSummary.reason.';

export const SCENARIO_OPEN_SLOT_REASON_FALLBACK = SCENARIO_OPEN_SLOT_REASON.CAPACITY_OR_RULES;
