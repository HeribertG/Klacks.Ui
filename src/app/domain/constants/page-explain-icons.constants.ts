// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Maps explain_page_* skill names to the main-nav icon DOM ids Klacksy pulses while explaining a page,
 * and to the route of the explained page (plus, for single cards, the data-klacksy-target to scroll to)
 * so the app can bring the user there automatically.
 * Icon entries list candidate ids tried in order until one exists (dashboard falls back from the
 * default logo icon to the custom company-logo image).
 */

import { ONBOARDING_NAV_ICON } from './onboarding-stations';

export const EXPLAIN_PAGE_SKILL_PREFIX = 'explain_page_';
export const EXPLAIN_SKILL_PREFIX = 'explain_';

export const HEADER_LOGO_ICON_ID = 'header-logo-icon';
export const HEADER_LOGO_IMAGE_ID = 'header-logo-image';

const SETTINGS_ROUTE = '/workplace/settings';

// Explain skills that document exactly one settings card, keyed to that card's data-klacksy-target.
// Concept skills spanning several places (or a person/shift record) stay unmapped on purpose.
const SETTINGS_CARD_EXPLAIN_TARGETS: Record<string, string> = {
  [`${EXPLAIN_PAGE_SKILL_PREFIX}settings_erp_drop_points`]: 'erp-drop-points',
  [`${EXPLAIN_PAGE_SKILL_PREFIX}import_employees`]: 'client-import',
  explain_email_setup: 'email-config',
  explain_report_designer: 'reports',
  explain_spam_rules: 'spam-rules',
  explain_identity_providers: 'identity-providers',
  explain_export_formats_model: 'export-formats',
  explain_calendar_model: 'calendar-rules',
  explain_absence_type_flags: 'absence-types',
  explain_active_industries: 'active-industries',
  explain_surcharge_mode: 'surcharge-mode',
  explain_overtime_model: 'overtime',
  explain_individual_periods: 'individual-periods',
  explain_scheduling_rules_model: 'scheduling-rules',
  explain_whisper_setup: 'whisper-plugin',
  explain_klacksy_speech_setup: 'assistant-speech',
  explain_klacksy_learning: 'assistant-learning',
  explain_klacksy_skill_relations: 'assistant-skill-relations',
  explain_klacksy_autonomy: 'klacksy-autonomy',
  explain_klacksy_personality: 'assistant-personality',
  explain_klacksy_llm_setup: 'llm-provider',
  explain_software_updates: 'updates',
  explain_personal_access_tokens: 'personal-access-tokens',
};

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
  [`${EXPLAIN_PAGE_SKILL_PREFIX}settings_overview`]: SETTINGS_ROUTE,
  [`${EXPLAIN_PAGE_SKILL_PREFIX}profile`]: '/workplace/profile',
  explain_planning_divide_et_impera: '/workplace/schedule',
  explain_planning_sheets_modular: '/workplace/schedule',
  explain_planning_assistant: '/workplace/schedule',
  explain_shift_type_preferences: '/workplace/schedule',
  explain_macro_editor: '/workplace/settings',
  explain_shift_sporadic: '/workplace/shift',
  explain_shift_time_range: '/workplace/shift',
  explain_shift_container: '/workplace/shift',
  explain_shift_lifecycle_order_to_shift: '/workplace/new-shift',
  explain_payroll_export_handoff: '/workplace/period-closing',
  explain_navigation_learning: '/workplace/klacksy-training',
  ...Object.fromEntries(
    Object.keys(SETTINGS_CARD_EXPLAIN_TARGETS).map((skill) => [skill, SETTINGS_ROUTE]),
  ),
};

// Card-level explain skills whose card sits inside a long page (and, on settings, behind expert mode
// and a collapsible section): navigating to the route alone would leave the card out of sight.
export const PAGE_EXPLAIN_TARGETS: Record<string, string> = {
  ...SETTINGS_CARD_EXPLAIN_TARGETS,
  explain_payroll_export_handoff: 'period-closing-export-tab-employee',
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
