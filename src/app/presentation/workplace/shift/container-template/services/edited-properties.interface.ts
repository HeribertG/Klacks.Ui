// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TransportModeEnum } from 'src/app/domain/enums/transport-mode.enum';

export interface EditedProperties {
  timeRangeStartItem: string;
  briefingTime: string;
  debriefingTime: string;
  travelTimeBefore: string;
  travelTimeAfter: string;
  transportMode: TransportModeEnum;
}
