// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Day-specific override for a container shift, detached from the weekly template.
 * @param containerId - The container shift this override belongs to
 * @param date - The specific date of this override (ISO format)
 * @param hasWork - Whether work entries exist for this date (locks editing)
 */
import { IShift } from '../shift/shift.interface';
import { ContainerTransportModeEnum } from '../../enums/transport-mode.enum';
import { IContainerShiftOverrideItem } from './container-shift-override-item.interface';
import { IRouteInfo } from './route-info.interface';

export interface IContainerShiftOverride {
  id?: string;
  containerId: string;
  date: string;
  fromTime: string;
  untilTime: string;
  startBase?: string;
  endBase?: string;
  routeInfo?: IRouteInfo;
  transportMode?: ContainerTransportModeEnum;
  hasWork: boolean;
  shift?: IShift;
  containerShiftOverrideItems: IContainerShiftOverrideItem[];
}
