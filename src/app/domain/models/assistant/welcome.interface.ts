// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Welcome payload returned by GET /api/backend/assistant/chat/welcome.
 * Contains only i18n keys + slot values — the FE resolves all keys via TranslateService.
 */
import { IWelcomeFocus } from 'src/app/domain/models/assistant/welcome-focus.interface';
import { OnboardingKind } from 'src/app/domain/constants/onboarding-stations';

export interface IWelcomeResponse {
  greetingKey: string;
  greetingText?: string;
  greetingVariantIndex: number;
  weekdayKey: string;
  weatherKey: string;
  ambientKey?: string;
  ambientHolidayName?: string;
  displayName: string;
  suggestionKeys: string[];
  suggestionRoutes?: Record<string, string>;
  onboarding?: IOnboardingState | null;
  focus?: IWelcomeFocus | null;
}

/**
 * Tour state (setup tour of the installation or intro tour of the account, see `kind`; missing = setup).
 * Returned in the welcome payload and by the onboarding-state endpoint. `completedStations` holds station
 * ids from the frontend catalog; progress is derived from it. `isLegacyOffer` marks the single release-time
 * offer of an existing account, which is shown once and without the "later" chip.
 */
export interface IOnboardingState {
  kind?: OnboardingKind;
  shouldOffer: boolean;
  llmLive?: boolean;
  showCard: boolean;
  status: string;
  completedStations: string[];
  isLegacyOffer?: boolean;
  snoozeCount?: number;
  lastOfferedAt?: string | null;
}

export interface ISaveOnboardingStateRequest {
  kind?: OnboardingKind;
  status?: string;
  completedStation?: string;
}

export interface IWelcomeRequest {
  lang: string;
  localHour: number;
  weekday: number;
  route?: string;
  latitude?: number;
  longitude?: number;
  displayName?: string;
  excludeVariantIndex?: number;
  isReopen?: boolean;
}
