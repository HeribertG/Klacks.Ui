// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Catalog of the Klacksy first-run setup-tour stations (single source of truth for order + total).
 * `type` decides how a station is handled: 'ask' = Klacksy collects the value in chat and writes it,
 * 'navigate' = open the page and let the user look at or fill the real form, 'explain' = explain only.
 * `target` is the data-klacksy-target anchor on the page (empty = navigate without scrolling);
 * `route` overrides the default /workplace/settings destination for workspace stations;
 * `navIconId` is the main-nav icon Klacksy pulses so the user learns which icon opens the page;
 * `explainKey` is the i18n key of the message Klacksy posts for the station.
 */

import { AppSetting } from 'src/app/domain/models/settings/settings-various-class';

export type OnboardingStationType = 'ask' | 'navigate' | 'explain';

export interface IOnboardingStation {
  id: string;
  type: OnboardingStationType;
  target: string;
  explainKey: string;
  navIconId: string;
  route?: string;
}

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
} as const;

export const ONBOARDING_ROUTE = {
  Employees: '/workplace/client',
  Shifts: '/workplace/shift',
  Availability: '/workplace/client-availability',
  PeriodClosing: '/workplace/period-closing',
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

export const ONBOARDING_STATUS = {
  Pending: 'pending',
  InProgress: 'in_progress',
  Snoozed: 'snoozed',
  Dismissed: 'dismissed',
  Completed: 'completed',
} as const;

export const ONBOARDING_OFFER_CHOICE = {
  Accept: 'accept',
  Snooze: 'snooze',
  Dismiss: 'dismiss',
} as const;

export const ONBOARDING_TOUR_CHOICE = {
  Done: 'done',
  Skip: 'skip',
  End: 'end',
} as const;

const EXPLAIN = 'assistant-chat.onboarding.explain.';

export const ONBOARDING_STATIONS: readonly IOnboardingStation[] = [
  { id: 'title', type: 'ask', target: 'settings-general', explainKey: EXPLAIN + 'title', navIconId: ONBOARDING_NAV_ICON.Settings },
  { id: 'address', type: 'ask', target: 'owner-address', explainKey: EXPLAIN + 'address', navIconId: ONBOARDING_NAV_ICON.Settings },
  { id: 'calendar', type: 'navigate', target: 'calendar-selection', explainKey: EXPLAIN + 'calendar', navIconId: ONBOARDING_NAV_ICON.Schedules },
  { id: 'users', type: 'navigate', target: 'user-management', explainKey: EXPLAIN + 'users', navIconId: ONBOARDING_NAV_ICON.Settings },
  { id: 'group-scope', type: 'navigate', target: 'group-scope', explainKey: EXPLAIN + 'group-scope', navIconId: ONBOARDING_NAV_ICON.Groups },
  { id: 'identity-provider', type: 'navigate', target: 'identity-providers', explainKey: EXPLAIN + 'identity-provider', navIconId: ONBOARDING_NAV_ICON.Settings },
  { id: 'scheduling', type: 'explain', target: 'scheduling-defaults', explainKey: EXPLAIN + 'scheduling', navIconId: ONBOARDING_NAV_ICON.Schedules },
  { id: 'employees', type: 'navigate', target: '', explainKey: EXPLAIN + 'employees', navIconId: ONBOARDING_NAV_ICON.Employees, route: ONBOARDING_ROUTE.Employees },
  { id: 'shifts', type: 'navigate', target: '', explainKey: EXPLAIN + 'shifts', navIconId: ONBOARDING_NAV_ICON.Shifts, route: ONBOARDING_ROUTE.Shifts },
  { id: 'availability', type: 'navigate', target: '', explainKey: EXPLAIN + 'availability', navIconId: ONBOARDING_NAV_ICON.Availability, route: ONBOARDING_ROUTE.Availability },
  { id: 'absence', type: 'explain', target: 'absence-types', explainKey: EXPLAIN + 'absence', navIconId: ONBOARDING_NAV_ICON.Absences },
  { id: 'holidays', type: 'explain', target: 'calendar-rules', explainKey: EXPLAIN + 'holidays', navIconId: ONBOARDING_NAV_ICON.Schedules },
  { id: 'period-closing', type: 'navigate', target: '', explainKey: EXPLAIN + 'period-closing', navIconId: ONBOARDING_NAV_ICON.PeriodClosing, route: ONBOARDING_ROUTE.PeriodClosing },
  { id: 'email', type: 'explain', target: 'email-config', explainKey: EXPLAIN + 'email', navIconId: ONBOARDING_NAV_ICON.Inbox },
  { id: 'llm-klacksy', type: 'explain', target: 'llm-provider', explainKey: EXPLAIN + 'llm-klacksy', navIconId: ONBOARDING_NAV_ICON.Settings },
  { id: 'plugins', type: 'explain', target: 'feature-plugins', explainKey: EXPLAIN + 'plugins', navIconId: ONBOARDING_NAV_ICON.Settings },
];

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
};

export function onboardingAskFields(stationId: string): readonly IOnboardingAskField[] {
  return ONBOARDING_ASK_FIELDS[stationId] ?? [];
}
