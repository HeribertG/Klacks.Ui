// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IShift } from '../shift/shift-class';
import { IAbsence } from '../absence/absence-class';
import { ContainerTransportModeEnum, TransportModeEnum } from '../../enums/transport-mode.enum';

export interface IRouteLocation {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  shiftId: string;
  distanceToNextKm: number;
  travelTimeToNext: string;
  order: number;
}

export interface IDirectionStep {
  instruction: string;
  streetName: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuverType: string;
}

export interface IRouteSegmentDirections {
  fromName: string;
  toName: string;
  transportMode: string;
  distanceKm: number;
  duration: string;
  steps: IDirectionStep[];
}

export interface IRouteInfo {
  startBase: string;
  endBase: string;
  totalDistanceKm: number;
  estimatedTravelTime: string;
  travelTimeFromStartBase: string;
  distanceFromStartBaseKm: number;
  distanceToEndBaseKm: number;
  travelTimeToEndBase: string;
  optimizedRoute: IRouteLocation[];
  segmentDirections?: IRouteSegmentDirections[];
}

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

export interface IContainerTemplateItem {
  id?: string;
  tmpId?: string;
  containerTemplateId?: string;
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
