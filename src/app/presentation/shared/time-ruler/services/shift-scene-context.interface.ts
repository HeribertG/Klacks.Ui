// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-item.interface';
import { Rectangle } from 'src/app/domain/models/geometry/rectangle.model';
import { OwnTime } from 'src/app/domain/models/schedule/own-time-class';

/**
 * Scene-level inputs reused across every public render method.
 * Bundles the mutable scene state (shifts + rectangle map) and the time window.
 */
export interface IShiftSceneContext {
  shifts: IContainerTemplateItem[];
  shiftRectangles: Map<IContainerTemplateItem, Rectangle>;
  fromTime: OwnTime;
  untilTime: OwnTime;
}
