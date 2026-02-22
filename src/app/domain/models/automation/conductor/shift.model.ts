// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IShift {
  id: string;
  name: string;
  date: Date;
  startTime: string;
  endTime: string;
  hours: number;
  requiredAssignments: number;
  priority: number;
}
