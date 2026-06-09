// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Catalog of the Klacksy first-run setup-tour stations (single source of truth for order + total).
 * `type` decides how a station is handled: 'ask' = Klacksy collects the value in chat and writes it,
 * 'navigate' = open the settings page and let the user fill the real form, 'explain' = explain only.
 * `target` is the data-klacksy-target anchor on the /workplace/settings page; `explainKey` is the
 * i18n key of the message Klacksy posts for navigate/explain stations.
 */

import { AppSetting } from 'src/app/domain/models/settings/settings-various-class';

export type OnboardingStationType = 'ask' | 'navigate' | 'explain';

export interface IOnboardingStation {
  id: string;
  type: OnboardingStationType;
  target: string;
  explainKey: string;
}

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
  { id: 'title', type: 'ask', target: 'settings-general', explainKey: EXPLAIN + 'title' },
  { id: 'address', type: 'ask', target: 'owner-address', explainKey: EXPLAIN + 'address' },
  { id: 'calendar', type: 'navigate', target: 'calendar-selection', explainKey: EXPLAIN + 'calendar' },
  { id: 'users', type: 'navigate', target: 'user-management', explainKey: EXPLAIN + 'users' },
  { id: 'group-scope', type: 'navigate', target: 'group-scope', explainKey: EXPLAIN + 'group-scope' },
  { id: 'identity-provider', type: 'navigate', target: 'identity-providers', explainKey: EXPLAIN + 'identity-provider' },
  { id: 'scheduling', type: 'explain', target: 'scheduling-defaults', explainKey: EXPLAIN + 'scheduling' },
  { id: 'absence', type: 'explain', target: 'absence-types', explainKey: EXPLAIN + 'absence' },
  { id: 'holidays', type: 'explain', target: 'calendar-rules', explainKey: EXPLAIN + 'holidays' },
  { id: 'email', type: 'explain', target: 'email-config', explainKey: EXPLAIN + 'email' },
  { id: 'llm-klacksy', type: 'explain', target: 'llm-provider', explainKey: EXPLAIN + 'llm-klacksy' },
  { id: 'plugins', type: 'explain', target: 'feature-plugins', explainKey: EXPLAIN + 'plugins' },
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
