// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Canonical section-key strings for the dashboard's collapsible sections.
 * Shared between the component (section state, ordering, visibility) and
 * dashboard-target-sections.constants.ts so both stay in lock-step with a
 * single source of truth instead of duplicating the literal strings.
 */
export const DASHBOARD_SECTION_OVERVIEW = 'overview';
export const DASHBOARD_SECTION_COVERAGE = 'coverage';
export const DASHBOARD_SECTION_RESOURCES = 'resources';
export const DASHBOARD_SECTION_LOCATIONS = 'locations';

export const DASHBOARD_SECTION_ORDER = [
  DASHBOARD_SECTION_OVERVIEW,
  DASHBOARD_SECTION_COVERAGE,
  DASHBOARD_SECTION_RESOURCES,
  DASHBOARD_SECTION_LOCATIONS,
] as const;
