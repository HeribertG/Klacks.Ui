// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-item.interface';
import { ItemPosition } from './item-position.interface';

export interface DragUpdateResult {
  draggedPosition: { newStartMinutes: number; newEndMinutes: number };
  displacements: Map<IContainerTemplateItem, ItemPosition>;
}
