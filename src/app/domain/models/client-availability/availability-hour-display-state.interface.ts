// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { AvailabilityDisplayState } from './availability-display-state.enum';

export interface IAvailabilityHourDisplayState {
  hour: number;
  state: AvailabilityDisplayState;
}
