// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Maps explain_page_* skill names to the main-nav icon DOM ids Klacksy pulses while explaining a page.
 * Each entry lists candidate ids tried in order until one exists (dashboard falls back from the
 * default logo icon to the custom company-logo image).
 */

import { ONBOARDING_NAV_ICON } from './onboarding-stations';

export const EXPLAIN_PAGE_SKILL_PREFIX = 'explain_page_';

export const HEADER_LOGO_ICON_ID = 'header-logo-icon';
export const HEADER_LOGO_IMAGE_ID = 'header-logo-image';

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
