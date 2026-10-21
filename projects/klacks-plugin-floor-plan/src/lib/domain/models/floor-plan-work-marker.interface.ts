// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { FloorPlanMarkerType } from '../enums/floor-plan-marker-type.enum';

export interface IFloorPlanWorkMarker {
  id?: string;
  floorPlanId: string;
  workId?: string;
  shiftId?: string;
  clientId?: string;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  markerType: FloorPlanMarkerType;
  clientName?: string;
  abbreviation?: string;
  startTime?: string;
  endTime?: string;
  fromDate?: Date;
  untilDate?: Date;
}
