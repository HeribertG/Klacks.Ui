// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Day-specific override for a container shift, detached from the weekly template.
 * @param containerId - The container shift this override belongs to
 * @param date - The specific date of this override (ISO format)
 * @param hasWork - Whether work entries exist for this date (locks editing)
 */
import { IShift } from '../shift/shift-class';
import { IAbsence } from '../absence/absence-class';
import { ContainerTransportModeEnum, TransportModeEnum } from '../../enums/transport-mode.enum';
import { IRouteInfo } from './container-template-class';

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

export interface IContainerShiftOverrideItem {
  id?: string;
  containerShiftOverrideId?: string;
  shiftId?: string;
  absenceId?: string;
  startItem?: string;
  endItem?: string;
  briefingTime: string;
  debriefingTime: string;
  travelTimeAfter: string;
  travelTimeBefore: string;
  timeRangeStartItem: string;
  timeRangeEndItem: string;
  transportMode?: TransportModeEnum;
  shift?: IShift;
  absence?: IAbsence;
}
