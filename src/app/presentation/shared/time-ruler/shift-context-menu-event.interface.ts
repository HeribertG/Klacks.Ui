// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-item.interface';

export interface IShiftContextMenuEvent {
  item: IContainerTemplateItem;
  mouseEvent: MouseEvent;
}
