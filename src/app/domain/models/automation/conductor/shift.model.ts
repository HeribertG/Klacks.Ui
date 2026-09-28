// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

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
