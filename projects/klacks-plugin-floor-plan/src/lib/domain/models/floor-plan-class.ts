// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IFloorPlan } from './floor-plan.interface';
import { FloorPlanWorkMarker } from './floor-plan-work-marker-class';

export class FloorPlan implements IFloorPlan {
  id?: string;
  name = '';
  description?: string;
  canvasJson?: string;
  thumbnailData?: string;
  workMarkers: FloorPlanWorkMarker[] = [];
}
