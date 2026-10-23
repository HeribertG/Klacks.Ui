// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Wire values of the Wizard 3 vision critic (mirror of PlanCriticStatus / PlanCriticSeverity in Klacks.Api) and the
 * translation keys of its report.
 */
export const PLAN_CRITIC_STATUS = {
  skipped: 'Skipped',
  completed: 'Completed',
  failed: 'Failed',
} as const;

export const PLAN_CRITIC_SEVERITY = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
} as const;

export const PLAN_CRITIC_SEVERITY_KEYS: Readonly<Record<string, string>> = {
  [PLAN_CRITIC_SEVERITY.low]: 'holisticHarmonizer.critic.severity-low',
  [PLAN_CRITIC_SEVERITY.medium]: 'holisticHarmonizer.critic.severity-medium',
  [PLAN_CRITIC_SEVERITY.high]: 'holisticHarmonizer.critic.severity-high',
};

export const PLAN_CRITIC_TEXT_KEYS = [
  'holisticHarmonizer.critic.title',
  'holisticHarmonizer.critic.intro',
  'holisticHarmonizer.critic.none',
  'holisticHarmonizer.critic.failed',
  'holisticHarmonizer.critic.discarded',
  'holisticHarmonizer.critic.model',
  ...Object.values(PLAN_CRITIC_SEVERITY_KEYS),
] as const;
