// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Route definitions for the floor-plan plugin.
 */

import { Routes } from '@angular/router';
import { FloorPlanHomeComponent } from './floor-plan-home/floor-plan-home.component';

export const FLOOR_PLAN_ROUTES: Routes = [
  { path: '', component: FloorPlanHomeComponent }
];
