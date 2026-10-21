// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { FabricObject } from 'fabric';
import { FloorPlanObjectData } from './floor-plan-object-data.interface';

export type FabricWithData = FabricObject & { data?: FloorPlanObjectData };
