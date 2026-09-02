// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Reporting-window options of the "Skill-Wirksamkeit" scorecard (W6). The backend rejects anything
 * outside 1..365 with a 400, so these values are a contract and not a free choice.
 */
export const SKILL_EFFECTIVENESS_DAY_OPTIONS = [7, 30, 90] as const;

export const SKILL_EFFECTIVENESS_DEFAULT_DAYS = 30;
