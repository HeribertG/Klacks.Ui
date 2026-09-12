// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Maps Klacksy in-page target IDs on the dashboard to the collapsible section
 * key that must be expanded before the target's marker exists in the DOM.
 * Pattern mirrors settings-target-sections.constants.ts (Klacksy Auto-Expand).
 */
import {
  DASHBOARD_SECTION_COVERAGE,
  DASHBOARD_SECTION_LOCATIONS,
  DASHBOARD_SECTION_OVERVIEW,
  DASHBOARD_SECTION_RESOURCES,
} from './dashboard-section-keys.constants';

export const DASHBOARD_TARGET_SECTIONS: Record<string, string> = {
  'dashboard.clients-overview': DASHBOARD_SECTION_OVERVIEW,
  'dashboard.shifts-overview': DASHBOARD_SECTION_OVERVIEW,
  'dashboard.shift-coverage': DASHBOARD_SECTION_COVERAGE,
  'dashboard.resource-monitor': DASHBOARD_SECTION_RESOURCES,
  'dashboard.clients-locations': DASHBOARD_SECTION_LOCATIONS,
};
