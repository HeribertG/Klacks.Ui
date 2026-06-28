// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Maps workplace route prefixes to the main-nav icon DOM ids Klacksy pulses after navigating
 * to a page. Candidate ids are tried in order until one exists (dashboard falls back from the
 * default logo icon to the custom company-logo image).
 * @param route - destination Angular route; may carry entity ids, query strings or fragments
 */

import { ONBOARDING_NAV_ICON } from './onboarding-stations';
import { HEADER_LOGO_ICON_ID, HEADER_LOGO_IMAGE_ID } from './page-explain-icons.constants';

export const ROUTE_NAV_ICONS: Record<string, readonly string[]> = {
  '/workplace/dashboard': [HEADER_LOGO_ICON_ID, HEADER_LOGO_IMAGE_ID],
  '/workplace/schedule': [ONBOARDING_NAV_ICON.Schedules],
  '/workplace/absence': [ONBOARDING_NAV_ICON.Absences],
  '/workplace/client-availability': [ONBOARDING_NAV_ICON.Availability],
  '/workplace/shift': [ONBOARDING_NAV_ICON.Shifts],
  '/workplace/new-shift': [ONBOARDING_NAV_ICON.Shifts],
  '/workplace/edit-shift': [ONBOARDING_NAV_ICON.Shifts],
  '/workplace/cut-shift': [ONBOARDING_NAV_ICON.Shifts],
  '/workplace/container-template': [ONBOARDING_NAV_ICON.Shifts],
  '/workplace/client': [ONBOARDING_NAV_ICON.Employees],
  '/workplace/edit-address': [ONBOARDING_NAV_ICON.Employees],
  '/workplace/group': [ONBOARDING_NAV_ICON.Groups],
  '/workplace/edit-group': [ONBOARDING_NAV_ICON.Groups],
  '/workplace/period-closing': [ONBOARDING_NAV_ICON.PeriodClosing],
  '/workplace/inbox': [ONBOARDING_NAV_ICON.Inbox],
  '/workplace/settings': [ONBOARDING_NAV_ICON.Settings],
};

export function resolveNavIconsForRoute(route: string | null | undefined): readonly string[] | null {
  if (!route) {
    return null;
  }

  let path = route.split(/[?#]/)[0].replace(/\/+$/, '').toLowerCase();

  while (path.length > 0) {
    const icons = ROUTE_NAV_ICONS[path];
    if (icons) {
      return icons;
    }
    const lastSlash = path.lastIndexOf('/');
    if (lastSlash <= 0) {
      return null;
    }
    path = path.slice(0, lastSlash);
  }

  return null;
}
