// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Welcome payload returned by GET /api/backend/assistant/chat/welcome.
 * Contains only i18n keys + slot values — the FE resolves all keys via TranslateService.
 */
import { IWelcomeFocus } from 'src/app/domain/models/assistant/welcome-focus.interface';
import { IOnboardingState } from './onboarding-state.interface';

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
