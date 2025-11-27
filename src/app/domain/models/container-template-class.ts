import { IShift } from './shift-class';

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
}

export interface IContainerTemplate {
  id?: string;
  containerId: string;
  fromTime: string;
  untilTime: string;
  weekday: number;
  isWeekdayOrHoliday: boolean;
  isHoliday: boolean;
  startBase?: string;
  endBase?: string;
  routeInfo?: IRouteInfo;
  shift?: IShift;
  containerTemplateItems: IContainerTemplateItem[];
}

export interface IContainerTemplateItem {
  id?: string;
  tmpId?: string;
  containerTemplateId?: string;
  shiftId: string;
  startShift?: string;
  endShift?: string;
  briefingTime: string;
  debriefingTime: string;
  travelTimeAfter: string;
  travelTimeBefore: string;
  timeRangeStartShift: string;
  timeRangeEndShift: string;
  shift?: IShift;
}
