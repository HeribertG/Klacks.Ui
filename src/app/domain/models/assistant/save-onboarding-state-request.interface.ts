// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { OnboardingKind } from 'src/app/domain/constants/onboarding-stations';

export interface ISaveOnboardingStateRequest {
  kind?: OnboardingKind;
  status?: string;
  completedStation?: string;
}
