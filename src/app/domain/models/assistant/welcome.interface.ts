// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Welcome payload returned by GET /api/backend/assistant/chat/welcome.
 * Contains only i18n keys + slot values — the FE resolves all keys via TranslateService.
 */
export interface IWelcomeResponse {
  greetingKey: string;
  greetingVariantIndex: number;
  weekdayKey: string;
  weatherKey: string;
  displayName: string;
  suggestionKeys: string[];
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
}
