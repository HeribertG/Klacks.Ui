// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Maps explain_page_* skill names to the main-nav icon DOM ids Klacksy pulses while explaining a page,
 * and to the route of the explained page so the app can bring the user there automatically.
 * Icon entries list candidate ids tried in order until one exists (dashboard falls back from the
 * default logo icon to the custom company-logo image).
 */

import { ONBOARDING_NAV_ICON } from './onboarding-stations';

export const EXPLAIN_PAGE_SKILL_PREFIX = 'explain_page_';
export const EXPLAIN_SKILL_PREFIX = 'explain_';

export const HEADER_LOGO_ICON_ID = 'header-logo-icon';
export const HEADER_LOGO_IMAGE_ID = 'header-logo-image';

export const PAGE_EXPLAIN_ROUTES: Record<string, string> = {
  [`${EXPLAIN_PAGE_SKILL_PREFIX}dashboard`]: '/workplace/dashboard',
  [`${EXPLAIN_PAGE_SKILL_PREFIX}schedule`]: '/workplace/schedule',
  [`${EXPLAIN_PAGE_SKILL_PREFIX}absence`]: '/workplace/absence',
  [`${EXPLAIN_PAGE_SKILL_PREFIX}availability`]: '/workplace/client-availability',
  [`${EXPLAIN_PAGE_SKILL_PREFIX}shifts`]: '/workplace/shift',
  [`${EXPLAIN_PAGE_SKILL_PREFIX}employees`]: '/workplace/client',
  [`${EXPLAIN_PAGE_SKILL_PREFIX}groups`]: '/workplace/group',
  [`${EXPLAIN_PAGE_SKILL_PREFIX}period_closing`]: '/workplace/period-closing',
  [`${EXPLAIN_PAGE_SKILL_PREFIX}inbox`]: '/workplace/inbox',
  [`${EXPLAIN_PAGE_SKILL_PREFIX}settings_overview`]: '/workplace/settings',
  [`${EXPLAIN_PAGE_SKILL_PREFIX}profile`]: '/workplace/profile',
  explain_planning_divide_et_impera: '/workplace/schedule',
  explain_planning_sheets_modular: '/workplace/schedule',
  explain_planning_assistant: '/workplace/schedule',
  explain_shift_type_preferences: '/workplace/schedule',
  explain_macro_editor: '/workplace/settings',
  explain_shift_sporadic: '/workplace/shift',
  explain_shift_time_range: '/workplace/shift',
  explain_shift_container: '/workplace/shift',
  explain_shift_lifecycle_order_to_shift: '/workplace/shift',
};

export const PAGE_EXPLAIN_NAV_ICONS: Record<string, readonly string[]> = {
  [`${EXPLAIN_PAGE_SKILL_PREFIX}dashboard`]: [HEADER_LOGO_ICON_ID, HEADER_LOGO_IMAGE_ID],
  [`${EXPLAIN_PAGE_SKILL_PREFIX}schedule`]: [ONBOARDING_NAV_ICON.Schedules],
  [`${EXPLAIN_PAGE_SKILL_PREFIX}absence`]: [ONBOARDING_NAV_ICON.Absences],
  [`${EXPLAIN_PAGE_SKILL_PREFIX}availability`]: [ONBOARDING_NAV_ICON.Availability],
  [`${EXPLAIN_PAGE_SKILL_PREFIX}shifts`]: [ONBOARDING_NAV_ICON.Shifts],
  [`${EXPLAIN_PAGE_SKILL_PREFIX}employees`]: [ONBOARDING_NAV_ICON.Employees],
  [`${EXPLAIN_PAGE_SKILL_PREFIX}groups`]: [ONBOARDING_NAV_ICON.Groups],
  [`${EXPLAIN_PAGE_SKILL_PREFIX}period_closing`]: [ONBOARDING_NAV_ICON.PeriodClosing],
  [`${EXPLAIN_PAGE_SKILL_PREFIX}inbox`]: [ONBOARDING_NAV_ICON.Inbox],
  [`${EXPLAIN_PAGE_SKILL_PREFIX}settings_overview`]: [ONBOARDING_NAV_ICON.Settings],
};
