// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IWorkBlock {
  id: string;
  startDate: Date;
  endDate: Date;
  hours: number;
  shiftIds: string[];
}
