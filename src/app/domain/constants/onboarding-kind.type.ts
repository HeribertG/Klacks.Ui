// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ONBOARDING_KIND } from './onboarding-stations';

export type OnboardingKind = (typeof ONBOARDING_KIND)[keyof typeof ONBOARDING_KIND];
