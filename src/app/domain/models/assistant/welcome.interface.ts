// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Welcome payload returned by GET /api/backend/assistant/chat/welcome.
 * Contains only i18n keys + slot values — the FE resolves all keys via TranslateService.
 */
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
}

/**
 * First-run setup-tour state. Returned in the welcome payload and by the onboarding-state endpoint.
 * `completedStations` holds station ids from the frontend catalog; progress is derived from it.
 */
export interface IOnboardingState {
  shouldOffer: boolean;
  llmLive?: boolean;
  showCard: boolean;
  status: string;
  completedStations: string[];
}

export interface ISaveOnboardingStateRequest {
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
