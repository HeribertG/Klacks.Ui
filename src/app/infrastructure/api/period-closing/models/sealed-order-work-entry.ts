// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface ISealedOrderWorkEntry {
  workId: string;
  employeeId: string;
  employeeName: string;
  employeeIdNumber: number;
  workDate: string;
  startTime: string;
  endTime: string;
  hours: number;
  surcharges: number;
  lockLevel: number;
  periodClosed: boolean;
}
