// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IOpenContainerShiftOverrideOptions {
  containerId: string;
  date: string;
  weekday: string;
  isHoliday: boolean;
  containerStartTime?: string;
  containerEndTime?: string;
  shiftAbbreviation?: string;
}
