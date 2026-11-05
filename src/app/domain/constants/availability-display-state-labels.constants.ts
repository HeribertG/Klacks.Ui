// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Translation keys of the availability display states, shared by the legend of the availability grid and the
 * hour list in the tooltip of a mixed cell group.
 */

import { AvailabilityDisplayState } from 'src/app/domain/models/client-availability/availability-display-state.enum';

export const AVAILABILITY_DISPLAY_STATE_LABEL_KEYS: Readonly<Record<AvailabilityDisplayState, string>> = {
  [AvailabilityDisplayState.Empty]: 'client-availability.legend.empty',
  [AvailabilityDisplayState.Available]: 'client-availability.legend.available',
  [AvailabilityDisplayState.Blocked]: 'client-availability.legend.blocked',
  [AvailabilityDisplayState.Mixed]: 'client-availability.legend.mixed',
};
