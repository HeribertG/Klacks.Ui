// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { OnboardingKind } from 'src/app/domain/constants/onboarding-kind.type';

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
