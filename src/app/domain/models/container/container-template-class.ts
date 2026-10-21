// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IShift } from '../shift/shift.interface';
import { IRouteInfo } from './route-info.interface';
import { IContainerTemplateItem } from './container-template-item.interface';
import { ContainerTransportModeEnum } from '../../enums/transport-mode.enum';

export interface IContainerTemplate {
  id?: string;
  containerId: string;
  fromTime: string;
  untilTime: string;
  weekday: number;
  isWeekdayAndHoliday: boolean;
  isHoliday: boolean;
  startBase?: string;
  endBase?: string;
  routeInfo?: IRouteInfo;
  transportMode?: ContainerTransportModeEnum;
  shift?: IShift;
  containerTemplateItems: IContainerTemplateItem[];
}
