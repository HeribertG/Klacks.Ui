// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Scheduling-policy values mirrored from Klacks.Api so the UI shows what the backend checks: the fallback the
 * backend applies when no setting carries a value (SchedulingPolicyDefaults) and the lowest value of a cap
 * (SchedulingCapLimits). A stored 0 on a rest minimum is a value ("no requirement"), not a missing one.
 */

export const SCHEDULING_DEFAULT_MIN_REST_HOURS = 11;

/** Lowest value a scheduling cap (max daily hours, max weekly hours, max consecutive days) may take; a cap is never 0. */
export const SCHEDULING_CAP_MIN_VALUE = 1;
