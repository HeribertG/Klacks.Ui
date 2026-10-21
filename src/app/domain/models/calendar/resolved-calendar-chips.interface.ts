// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { StateCountryToken } from 'src/app/domain/models/calendar/state-country-token-class';
import { OfficialOverrideMap } from './official-override-map.type';

export interface ResolvedCalendarChips {
  tokens: StateCountryToken[];
  overrides: OfficialOverrideMap;
}
