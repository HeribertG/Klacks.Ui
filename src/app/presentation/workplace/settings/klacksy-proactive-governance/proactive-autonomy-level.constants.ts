// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * The four rungs of the global autonomy level, mirroring the backend AutonomyLevel enum
 * (Propose = 0, Assisted = 1, Autonomous = 2, FullyAutonomous = 3). The level caps every trigger
 * kind's maxAction from above, so the ordinals must stay in step with the backend enum.
 */
export const PROACTIVE_AUTONOMY_LEVELS: readonly { value: number; labelKey: string }[] = [
  { value: 0, labelKey: 'setting.proactiveGovernance.global-level-0' },
  { value: 1, labelKey: 'setting.proactiveGovernance.global-level-1' },
  { value: 2, labelKey: 'setting.proactiveGovernance.global-level-2' },
  { value: 3, labelKey: 'setting.proactiveGovernance.global-level-3' },
];
