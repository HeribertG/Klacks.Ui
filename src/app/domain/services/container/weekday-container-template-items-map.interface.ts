// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IContainerTemplateItem } from '../../models/container/container-template-item.interface';

export interface IWeekdayContainerTemplateItemsMap {
  monday: IContainerTemplateItem[];
  tuesday: IContainerTemplateItem[];
  wednesday: IContainerTemplateItem[];
  thursday: IContainerTemplateItem[];
  friday: IContainerTemplateItem[];
  saturday: IContainerTemplateItem[];
  sunday: IContainerTemplateItem[];
  [bufferKey: string]: IContainerTemplateItem[];
}
