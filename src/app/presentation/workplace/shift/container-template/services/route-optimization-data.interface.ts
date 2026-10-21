// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TransportModeEnum } from 'src/app/domain/enums/transport-mode.enum';

export interface RouteOptimizationData {
  optimizedRoute: {
    shiftId: string;
    travelTimeToNext: string;
    transportMode?: TransportModeEnum;
  }[];
  travelTimeFromStartBase: string;
  travelTimeToEndBase: string;
  distanceToEndBaseKm: number;
}
