// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Route definitions for the floor-plan plugin.
 */

import { Routes } from '@angular/router';
import { FloorPlanHomeComponent } from './floor-plan-home/floor-plan-home.component';

export const FLOOR_PLAN_ROUTES: Routes = [
  { path: '', component: FloorPlanHomeComponent }
];
