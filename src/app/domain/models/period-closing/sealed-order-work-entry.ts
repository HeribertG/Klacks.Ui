// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
