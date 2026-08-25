// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * The three rungs of the proactive ladder, mirroring the backend ProactiveMaxAction enum.
 */
export const PROACTIVE_MAX_ACTIONS: readonly { value: number; labelKey: string }[] = [
  { value: 0, labelKey: 'setting.proactiveGovernance.maxAction-0' },
  { value: 1, labelKey: 'setting.proactiveGovernance.maxAction-1' },
  { value: 2, labelKey: 'setting.proactiveGovernance.maxAction-2' },
];
