// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IOpenContainerShiftOverrideOptions {
  containerId: string;
  date: string;
  weekday: string;
  isHoliday: boolean;
  containerStartTime?: string;
  containerEndTime?: string;
  shiftAbbreviation?: string;
}
