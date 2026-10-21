// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IFloorPlanWorkMarker } from './floor-plan-work-marker.interface';

export interface IFloorPlan {
  id?: string;
  name: string;
  description?: string;
  canvasJson?: string;
  thumbnailData?: string;
  workMarkers: IFloorPlanWorkMarker[];
}
