// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-item.interface';
import { Rectangle } from 'src/app/domain/models/geometry/rectangle.model';
import { ItemPosition } from './item-position.interface';

export interface DragState {
  isDragging: boolean;
  draggedShift: IContainerTemplateItem | null;
  draggedShiftRect: Rectangle | null;
  dragStartMouseY: number | undefined;
  originalStartMinutes: number | undefined;
  originalEndMinutes: number | undefined;
  originalPositions: Map<IContainerTemplateItem, ItemPosition>;
  pixelsPerMinute: number;
  snapToMinutes: number;
  displayFromMinutes: number;
  totalMinutes: number;
  isBlockDrag: boolean;
  blockItems: Set<IContainerTemplateItem>;
  blockOriginalPositions: Map<IContainerTemplateItem, ItemPosition>;
  blockEffectiveStart: number;
  blockEffectiveEnd: number;
}
