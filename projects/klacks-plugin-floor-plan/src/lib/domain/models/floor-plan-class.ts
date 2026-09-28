// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
