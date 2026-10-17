// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Catalog of the Klacksy first-run setup-tour stations (single source of truth for order + total).
 * `type` decides how a station is handled: 'ask' = the real settings form is opened and focused so the
 * user fills it in directly (autosaved by the settings page itself), except `default-language`, which
 * has no real form field yet and still collects the value in chat; 'navigate' = open the page and let
 * the user look at or fill the real form; 'explain' = explain only.
 * `target` is the data-klacksy-target anchor on the page (empty = navigate without scrolling);
 * `route` overrides the default /workplace/settings destination for workspace stations;
 * `navIconId` is the main-nav icon Klacksy pulses so the user learns which icon opens the page;
 * `explainKey` is the i18n key of the message Klacksy posts for the station.
 * The second catalog `INTRO_STATIONS` is the short per-account intro tour every user gets: `permission`
 * mirrors the right the station's route demands in its guard data (undefined = no right beyond a session),
 * `featureFlag` names a feature plugin that has to be enabled, `explainSkill` names the explain_page_*
 * skill the "More" chip asks Klacksy to run, and a station without `route` stays on the current page.
 */

import { AppSetting } from 'src/app/domain/models/settings/settings-various-class';
import { MESSAGING_PLUGIN_NAME, MESSAGING_PLUGIN_REQUIRED_PERMISSION } from './feature-plugin.constants';
import { PERMISSIONS, ROLE_ADMIN } from './permissions.constants';

export type OnboardingStationType = 'ask' | 'navigate' | 'explain';

export interface IOnboardingStation {
  id: string;
  type: OnboardingStationType;
  target: string;
  explainKey: string;
  navIconId: string;
  route?: string;
  permission?: string;
  featureFlag?: string;
  explainSkill?: string;
  pageNameKey?: string;
}

export const ONBOARDING_KIND = {
  Setup: 'setup',
  Intro: 'intro',
} as const;

export type OnboardingKind = (typeof ONBOARDING_KIND)[keyof typeof ONBOARDING_KIND];

export const ONBOARDING_NAV_ICON = {
  Settings: 'open-settings',
  Schedules: 'open-schedules',
  Absences: 'open-absences',
  Groups: 'open-groups',
  Inbox: 'open-inbox',
  Employees: 'open-employees',
  Shifts: 'open-shifts',
  Availability: 'open-availability',
  PeriodClosing: 'open-period-closing',
  Messaging: 'open-plugin-messaging',
  Assistant: 'header-assistant-button',
} as const;

export const ONBOARDING_ROUTE = {
  Employees: '/workplace/client',
  Shifts: '/workplace/shift',
  Availability: '/workplace/client-availability',
  PeriodClosing: '/workplace/period-closing',
  Schedule: '/workplace/schedule',
  Absences: '/workplace/absence',
  Messaging: '/workplace/messaging',
} as const;

/**
 * A single field Klacksy asks for during an 'ask' station. `kind` decides how the free-text answer is
 * turned into setting rows: 'text' writes the answer into `settingTypes[0]`; 'zipPlace' splits the
 * answer on the first whitespace into `settingTypes[0]` (zip) and `settingTypes[1]` (place).
 */
export type OnboardingAskFieldKind = 'text' | 'zipPlace';

export interface IOnboardingAskField {
  promptKey: string;
  kind: OnboardingAskFieldKind;
  settingTypes: string[];
}

export const ONBOARDING_SETTINGS_ROUTE = '/workplace/settings';

export const START_GUIDED_TOUR_SKILL = 'start_guided_tour';

export const START_GUIDED_TOUR_KIND_PARAM = 'kind';

export const ONBOARDING_STATUS = {
  Pending: 'pending',
  InProgress: 'in_progress',
  Snoozed: 'snoozed',
  Dismissed: 'dismissed',
  Completed: 'completed',
  LegacyOffer: 'legacy_offer',
  LegacyOffered: 'legacy_offered',
} as const;

export const ONBOARDING_OFFERED_EVENT = 'offered';

export const ONBOARDING_SETUP_OPEN_STATUSES: readonly string[] = [
  ONBOARDING_STATUS.Pending,
  ONBOARDING_STATUS.InProgress,
  ONBOARDING_STATUS.Snoozed,
];

export const ONBOARDING_RESTART_STATUSES: readonly string[] = [
  ONBOARDING_STATUS.Completed,
  ONBOARDING_STATUS.Dismissed,
  ONBOARDING_STATUS.LegacyOffered,
];

export const ONBOARDING_OFFER_CHOICE = {
  Accept: 'accept',
  Snooze: 'snooze',
  Dismiss: 'dismiss',
} as const;

export const ONBOARDING_TOUR_CHOICE = {
  Done: 'done',
  Skip: 'skip',
  End: 'end',
  Back: 'back',
  More: 'more',
} as const;

export const ONBOARDING_KNOWN_CHOICE = 'known';

export const ONBOARDING_STATION_LLM_PROVIDER = 'llm-provider';
export const ONBOARDING_STATION_DEFAULT_LANGUAGE = 'default-language';
export const ONBOARDING_STATION_TITLE = 'title';

const EXPLAIN = 'assistant-chat.onboarding.explain.';

export const ONBOARDING_STATIONS: readonly IOnboardingStation[] = [
  { id: ONBOARDING_STATION_TITLE, type: 'ask', target: 'settings-general', explainKey: EXPLAIN + 'title', navIconId: ONBOARDING_NAV_ICON.Settings },
  { id: 'branding', type: 'navigate', target: 'settings-general', explainKey: EXPLAIN + 'branding', navIconId: ONBOARDING_NAV_ICON.Settings },
  { id: 'address', type: 'ask', target: 'owner-address', explainKey: EXPLAIN + 'address', navIconId: ONBOARDING_NAV_ICON.Settings },
  { id: ONBOARDING_STATION_DEFAULT_LANGUAGE, type: 'ask', target: 'settings-general', explainKey: EXPLAIN + 'default-language', navIconId: ONBOARDING_NAV_ICON.Settings },
  { id: ONBOARDING_STATION_LLM_PROVIDER, type: 'navigate', target: 'llm-provider', explainKey: EXPLAIN + 'llm-provider', navIconId: ONBOARDING_NAV_ICON.Settings },
  { id: 'llm-sync', type: 'navigate', target: 'llm-sync-log', explainKey: EXPLAIN + 'llm-sync', navIconId: ONBOARDING_NAV_ICON.Settings },
  { id: 'llm-model-check', type: 'navigate', target: 'klacksy-model-check', explainKey: EXPLAIN + 'llm-model-check', navIconId: ONBOARDING_NAV_ICON.Settings },
  { id: 'harmonizer', type: 'ask', target: 'wizard', explainKey: EXPLAIN + 'harmonizer', navIconId: ONBOARDING_NAV_ICON.Settings },
  { id: 'klacksy-settings', type: 'ask', target: 'assistant-speech', explainKey: EXPLAIN + 'klacksy-settings', navIconId: ONBOARDING_NAV_ICON.Settings },
  { id: 'calendar', type: 'navigate', target: 'owner-address', explainKey: EXPLAIN + 'calendar', navIconId: ONBOARDING_NAV_ICON.Settings },
  { id: 'email', type: 'explain', target: 'email-config', explainKey: EXPLAIN + 'email', navIconId: ONBOARDING_NAV_ICON.Inbox },
  { id: 'absence', type: 'explain', target: 'absence-types', explainKey: EXPLAIN + 'absence', navIconId: ONBOARDING_NAV_ICON.Absences },
  { id: 'weekend', type: 'navigate', target: 'scheduling-defaults', explainKey: EXPLAIN + 'weekend', navIconId: ONBOARDING_NAV_ICON.Schedules },
  { id: 'employees', type: 'navigate', target: '', explainKey: EXPLAIN + 'employees', navIconId: ONBOARDING_NAV_ICON.Employees, route: ONBOARDING_ROUTE.Employees },
  { id: 'shifts', type: 'navigate', target: '', explainKey: EXPLAIN + 'shifts', navIconId: ONBOARDING_NAV_ICON.Shifts, route: ONBOARDING_ROUTE.Shifts },
  { id: 'availability', type: 'navigate', target: '', explainKey: EXPLAIN + 'availability', navIconId: ONBOARDING_NAV_ICON.Availability, route: ONBOARDING_ROUTE.Availability },
  { id: 'period-closing', type: 'navigate', target: '', explainKey: EXPLAIN + 'period-closing', navIconId: ONBOARDING_NAV_ICON.PeriodClosing, route: ONBOARDING_ROUTE.PeriodClosing },
  { id: 'security', type: 'navigate', target: 'user-management', explainKey: EXPLAIN + 'security', navIconId: ONBOARDING_NAV_ICON.Settings },
  { id: 'web-search', type: 'navigate', target: 'web-search', explainKey: EXPLAIN + 'web-search', navIconId: ONBOARDING_NAV_ICON.Settings },
  { id: 'plugins', type: 'explain', target: 'feature-plugins', explainKey: EXPLAIN + 'plugins', navIconId: ONBOARDING_NAV_ICON.Settings },
];

export const INTRO_STATION = {
  Schedule: 'intro-schedule',
  Shifts: 'intro-shifts',
  Absences: 'intro-absences',
  People: 'intro-people',
  PeriodClosing: 'intro-period-closing',
  Klacksy: 'intro-klacksy',
  Messaging: 'intro-messaging',
} as const;

export const INTRO_EXPLAIN_SKILL = {
  Schedule: 'explain_page_schedule',
  Shifts: 'explain_page_shifts',
  Absences: 'explain_page_absence',
  People: 'explain_page_employees',
  PeriodClosing: 'explain_page_period_closing',
} as const;

const INTRO = 'assistant-chat.onboarding.intro.';
const INTRO_EXPLAIN = INTRO + 'explain.';
const INTRO_PAGE = INTRO + 'page.';

export const INTRO_STATIONS: readonly IOnboardingStation[] = [
  {
    id: INTRO_STATION.Schedule,
    type: 'explain',
    target: '',
    explainKey: INTRO_EXPLAIN + 'schedule',
    navIconId: ONBOARDING_NAV_ICON.Schedules,
    route: ONBOARDING_ROUTE.Schedule,
    explainSkill: INTRO_EXPLAIN_SKILL.Schedule,
    pageNameKey: INTRO_PAGE + 'schedule',
  },
  {
    id: INTRO_STATION.Shifts,
    type: 'explain',
    target: '',
    explainKey: INTRO_EXPLAIN + 'shifts',
    navIconId: ONBOARDING_NAV_ICON.Shifts,
    route: ONBOARDING_ROUTE.Shifts,
    explainSkill: INTRO_EXPLAIN_SKILL.Shifts,
    pageNameKey: INTRO_PAGE + 'shifts',
  },
  {
    id: INTRO_STATION.Absences,
    type: 'explain',
    target: '',
    explainKey: INTRO_EXPLAIN + 'absences',
    navIconId: ONBOARDING_NAV_ICON.Absences,
    route: ONBOARDING_ROUTE.Absences,
    explainSkill: INTRO_EXPLAIN_SKILL.Absences,
    pageNameKey: INTRO_PAGE + 'absences',
  },
  {
    id: INTRO_STATION.People,
    type: 'explain',
    target: '',
    explainKey: INTRO_EXPLAIN + 'people',
    navIconId: ONBOARDING_NAV_ICON.Employees,
    route: ONBOARDING_ROUTE.Employees,
    explainSkill: INTRO_EXPLAIN_SKILL.People,
    pageNameKey: INTRO_PAGE + 'people',
  },
  {
    id: INTRO_STATION.PeriodClosing,
    type: 'explain',
    target: '',
    explainKey: INTRO_EXPLAIN + 'period-closing',
    navIconId: ONBOARDING_NAV_ICON.PeriodClosing,
    route: ONBOARDING_ROUTE.PeriodClosing,
    permission: ROLE_ADMIN,
    explainSkill: INTRO_EXPLAIN_SKILL.PeriodClosing,
    pageNameKey: INTRO_PAGE + 'period-closing',
  },
  {
    id: INTRO_STATION.Klacksy,
    type: 'explain',
    target: '',
    explainKey: INTRO_EXPLAIN + 'klacksy',
    navIconId: ONBOARDING_NAV_ICON.Assistant,
    permission: PERMISSIONS.CanUseAssistant,
  },
  {
    id: INTRO_STATION.Messaging,
    type: 'explain',
    target: '',
    explainKey: INTRO_EXPLAIN + 'messaging',
    navIconId: ONBOARDING_NAV_ICON.Messaging,
    route: ONBOARDING_ROUTE.Messaging,
    permission: MESSAGING_PLUGIN_REQUIRED_PERMISSION,
    featureFlag: MESSAGING_PLUGIN_NAME,
  },
];

export const INTRO_ADMIN_SETUP_HINT_KEY = INTRO + 'admin-setup-hint';
export const INTRO_MORE_REQUEST_KEY = INTRO + 'more-request';
export const INTRO_MORE_PAGE_PARAM = 'page';

/**
 * Narrows the intro catalog to the stations the current user can actually open.
 * @param hasPermission - Whether the user holds a right or role
 * @param isFeatureEnabled - Whether a feature plugin is installed and enabled
 */
export function filterIntroStations(
  hasPermission: (permission: string) => boolean,
  isFeatureEnabled: (feature: string) => boolean,
): readonly IOnboardingStation[] {
  return INTRO_STATIONS.filter(
    (station) =>
      (!station.permission || hasPermission(station.permission)) &&
      (!station.featureFlag || isFeatureEnabled(station.featureFlag)),
  );
}

const ASK = 'assistant-chat.onboarding.ask.';

export const ONBOARDING_ASK_FIELDS: Record<string, readonly IOnboardingAskField[]> = {
  title: [{ promptKey: ASK + 'title', kind: 'text', settingTypes: [AppSetting.APP_NAME] }],
  address: [
    { promptKey: ASK + 'address-name', kind: 'text', settingTypes: [AppSetting.APP_ADDRESS_NAME] },
    { promptKey: ASK + 'address-street', kind: 'text', settingTypes: [AppSetting.APP_ADDRESS_ADDRESS] },
    {
      promptKey: ASK + 'address-zip-place',
      kind: 'zipPlace',
      settingTypes: [AppSetting.APP_ADDRESS_ZIP, AppSetting.APP_ADDRESS_PLACE],
    },
    { promptKey: ASK + 'address-country', kind: 'text', settingTypes: [AppSetting.APP_ADDRESS_COUNTRY] },
  ],
  'default-language': [
    { promptKey: ASK + 'default-language', kind: 'text', settingTypes: [AppSetting.DEFAULT_LANGUAGE] },
  ],
};

export function onboardingAskFields(stationId: string): readonly IOnboardingAskField[] {
  return ONBOARDING_ASK_FIELDS[stationId] ?? [];
}
