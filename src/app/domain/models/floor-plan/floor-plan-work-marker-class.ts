// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { FloorPlanMarkerType } from 'src/app/domain/enums/floor-plan-marker-type.enum';

export interface IFloorPlanWorkMarker {
  id?: string;
  floorPlanId: string;
  workId?: string;
  clientId?: string;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  markerType: FloorPlanMarkerType;
  clientName?: string;
  shiftName?: string;
  startTime?: string;
  endTime?: string;
}

export class FloorPlanWorkMarker implements IFloorPlanWorkMarker {
  id?: string;
  floorPlanId = '';
  workId?: string;
  clientId?: string;
  label?: string;
  x = 0;
  y = 0;
  width = 100;
  height = 50;
  color?: string;
  markerType: FloorPlanMarkerType = FloorPlanMarkerType.Work;
  clientName?: string;
  shiftName?: string;
  startTime?: string;
  endTime?: string;
}
