// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import {
  GridSurfaceTemplateComponent,
} from 'src/app/presentation/shared/grid/body/grid-surface-template/grid-surface-template.component';
import { ElementRef } from '@angular/core';

export interface FillHandleDragContext {
  gridSurface: GridSurfaceTemplateComponent;
  el: ElementRef<HTMLCanvasElement>;
}
