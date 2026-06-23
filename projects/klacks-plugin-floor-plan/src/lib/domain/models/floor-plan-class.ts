// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { FloorPlanWorkMarker, IFloorPlanWorkMarker } from './floor-plan-work-marker-class';

export interface IFloorPlan {
  id?: string;
  name: string;
  description?: string;
  canvasJson?: string;
  thumbnailData?: string;
  workMarkers: IFloorPlanWorkMarker[];
}

export class FloorPlan implements IFloorPlan {
  id?: string;
  name = '';
  description?: string;
  canvasJson?: string;
  thumbnailData?: string;
  workMarkers: FloorPlanWorkMarker[] = [];
}
